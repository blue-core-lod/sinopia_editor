import React from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import Keycloak from "keycloak-js"
import { KeycloakProvider, useKeycloak } from "KeycloakContext"
import Config from "Config"

jest.mock("keycloak-js", () => jest.fn())

let context
const Consumer = () => {
  context = useKeycloak()
  return <div>{context.initialized ? "ready" : "loading"}</div>
}

const MINUTE = 60 * 1000

const newInstance = (overrides = {}) => ({
  init: jest.fn().mockResolvedValue(true),
  updateToken: jest.fn().mockResolvedValue(true),
  isTokenExpired: jest.fn().mockReturnValue(false),
  refreshToken: "refresh-token",
  // Session ends in an hour.
  refreshTokenParsed: { exp: (Date.now() + 60 * MINUTE) / 1000 },
  timeSkew: 0,
  ...overrides,
})

const renderProvider = async (instance) => {
  Keycloak.mockImplementation(() => instance)
  render(
    <KeycloakProvider>
      <Consumer />
    </KeycloakProvider>
  )
  await screen.findByText("ready")
}

// Fake version of how Sinopia tabs talk to each other.
let channel
class FakeBroadcastChannel {
  constructor(name) {
    this.name = name
    this.postMessage = jest.fn()
    this.close = jest.fn()
    channel = this
  }
}
// Pretends another tab extended the session.
const fromOtherTab = (sessionExpiresAt) =>
  act(() => channel.onmessage({ data: { sessionExpiresAt } }))

// Pretends time has passed.
const later = (ms = MINUTE) =>
  jest.spyOn(Date, "now").mockReturnValue(new Date().getTime() + ms)

describe("KeycloakProvider", () => {
  beforeEach(() => {
    global.BroadcastChannel = FakeBroadcastChannel
  })
  afterEach(() => {
    jest.restoreAllMocks()
    delete global.BroadcastChannel
  })

  // Users already signed in elsewhere (like Marva) are signed in here too.
  it("signs in from an existing session and watches for logouts", async () => {
    jest
      .spyOn(Config, "sinopiaUrl", "get")
      .mockReturnValue("http://localhost/sinopia/")
    const instance = newInstance()
    await renderProvider(instance)

    expect(instance.init).toHaveBeenCalledWith({
      onLoad: "check-sso",
      silentCheckSsoRedirectUri:
        "http://localhost/sinopia/dist/silent-check-sso.html",
      checkLoginIframe: true,
    })
  })

  // Logging out in another tab or app logs the user out here.
  it("marks the session expired when Keycloak reports a logout", async () => {
    const instance = newInstance()
    await renderProvider(instance)

    act(() => instance.onAuthLogout())

    expect(context.sessionExpired).toBe(true)
  })

  // Tracks when the session ends, and updates it after renewals.
  it("tracks when the SSO session ends", async () => {
    const instance = newInstance({
      refreshTokenParsed: { exp: 1000 },
      timeSkew: 5,
    })
    await renderProvider(instance)

    expect(context.sessionExpiresAt).toEqual(1005 * 1000)

    instance.refreshTokenParsed = { exp: 2000 }
    act(() => instance.onAuthRefreshSuccess())
    expect(context.sessionExpiresAt).toEqual(2005 * 1000)
  })

  // Active users get a new token when the old one runs out.
  it("renews an expiring token when the user has been active", async () => {
    const instance = newInstance()
    await renderProvider(instance)

    later()
    fireEvent.keyDown(window)
    await act(() => instance.onTokenExpired())

    expect(instance.updateToken).toHaveBeenCalledWith(30)
  })

  // Clicking during the warning doesn't extend the session.
  it("does not renew an expiring token during the final warning", async () => {
    const instance = newInstance({
      refreshTokenParsed: { exp: (Date.now() + 4 * MINUTE) / 1000 },
    })
    await renderProvider(instance)

    later()
    fireEvent.mouseDown(window)
    await act(() => instance.onTokenExpired())

    expect(instance.updateToken).not.toHaveBeenCalled()
  })

  // Idle users don't get a new token, so they can time out.
  it("lets the session idle when the user has not been active", async () => {
    const instance = newInstance()
    await renderProvider(instance)

    await act(() => instance.onTokenExpired())

    expect(instance.updateToken).not.toHaveBeenCalled()
  })

  // A user coming back from a break gets a new token right away.
  it("renews an expired token when an idle user returns", async () => {
    const instance = newInstance({
      isTokenExpired: jest.fn().mockReturnValue(true),
    })
    await renderProvider(instance)

    fireEvent.mouseDown(window)

    expect(instance.updateToken).toHaveBeenCalledWith(-1)
  })

  // Activity renews the session at most once a minute.
  it("refreshes active users at most every minute", async () => {
    const instance = newInstance()
    await renderProvider(instance)

    fireEvent.keyDown(window)
    expect(instance.updateToken).not.toHaveBeenCalled()

    later(2 * MINUTE)
    fireEvent.keyDown(window)
    expect(instance.updateToken).toHaveBeenCalledWith(-1)
  })

  // With a short timeout, activity renews sooner.
  it("refreshes active users sooner when the warning is less than a minute away", async () => {
    const instance = newInstance({
      refreshTokenParsed: { exp: (Date.now() + 5.9 * MINUTE) / 1000 },
    })
    await renderProvider(instance)

    fireEvent.keyDown(window)
    expect(instance.updateToken).not.toHaveBeenCalled()

    later(20 * 1000)
    fireEvent.keyDown(window)
    expect(instance.updateToken).toHaveBeenCalledWith(-1)
  })

  // Just moving the mouse keeps the session going.
  it("counts mouse movement as activity", async () => {
    const instance = newInstance()
    await renderProvider(instance)

    later(2 * MINUTE)
    fireEvent.mouseMove(window)

    expect(instance.updateToken).toHaveBeenCalledWith(-1)
  })

  // Clicks inside dropdowns and dialogs still count as activity.
  it("counts activity that a component stops from propagating", async () => {
    const instance = newInstance()
    await renderProvider(instance)
    const button = document.createElement("button")
    button.addEventListener("mousedown", (event) => event.stopPropagation())
    document.body.appendChild(button)

    later(2 * MINUTE)
    fireEvent.mouseDown(button)

    expect(instance.updateToken).toHaveBeenCalledWith(-1)
    button.remove()
  })

  // Once the warning shows, the user has to click Continue.
  it("does not extend the session on activity during the final warning", async () => {
    const instance = newInstance({
      isTokenExpired: jest.fn().mockReturnValue(true),
      refreshTokenParsed: { exp: (Date.now() + 4 * MINUTE) / 1000 },
    })
    await renderProvider(instance)

    fireEvent.mouseDown(window)

    expect(instance.updateToken).not.toHaveBeenCalled()
  })

  // Clicking Continue extends the session.
  it("extends the session on request", async () => {
    const instance = newInstance()
    await renderProvider(instance)

    await act(async () => {
      expect(await context.extendSession()).toBe(true)
    })

    expect(instance.updateToken).toHaveBeenCalledWith(-1)
  })

  // If Keycloak says the session is over, the user is logged out.
  it("marks the session expired when Keycloak rejects a renewal", async () => {
    const instance = newInstance({
      updateToken: jest.fn().mockImplementation(() => {
        // Keycloak rejects the renewal.
        instance.onAuthLogout()
        return Promise.reject(new Error("400"))
      }),
    })
    await renderProvider(instance)

    await act(() => context.extendSession())

    expect(context.sessionExpired).toBe(true)
  })

  // A network problem doesn't log the user out.
  it("does not mark the session expired when renewal fails for another reason", async () => {
    const instance = newInstance({
      updateToken: jest.fn().mockRejectedValue(new Error("Network down")),
    })
    await renderProvider(instance)

    await act(async () => {
      expect(await context.extendSession()).toBe(false)
    })

    expect(context.sessionExpired).toBe(false)
  })

  describe("with other tabs open", () => {
    // Tells other tabs when this tab extends the session.
    it("tells other tabs when the session is extended", async () => {
      const instance = newInstance({ refreshTokenParsed: { exp: 1000 } })
      await renderProvider(instance)

      expect(channel.name).toEqual("sinopia-session")
      expect(channel.postMessage).toHaveBeenCalledWith({
        sessionExpiresAt: 1000 * 1000,
      })

      instance.refreshTokenParsed = { exp: 2000 }
      act(() => instance.onAuthRefreshSuccess())
      expect(channel.postMessage).toHaveBeenLastCalledWith({
        sessionExpiresAt: 2000 * 1000,
      })
    })

    // Work in another tab extends this tab's session too.
    it("uses a later session end from another tab", async () => {
      const instance = newInstance()
      await renderProvider(instance)
      const laterEnd = Date.now() + 90 * MINUTE

      fromOtherTab(laterEnd)
      expect(context.sessionExpiresAt).toEqual(laterEnd)

      fromOtherTab(Date.now() + 70 * MINUTE)
      expect(context.sessionExpiresAt).toEqual(laterEnd)
    })

    // A background tab doesn't renew its token too early.
    it("does not renew its own tokens while they are still good", async () => {
      const instance = newInstance()
      await renderProvider(instance)

      fromOtherTab(Date.now() + 90 * MINUTE)

      expect(instance.updateToken).not.toHaveBeenCalled()
    })

    // A background tab renews its token before it runs out.
    it("renews its own tokens before they expire", async () => {
      const instance = newInstance({
        refreshTokenParsed: { exp: (Date.now() + 4 * MINUTE) / 1000 },
      })
      await renderProvider(instance)

      fromOtherTab(Date.now() + 30 * MINUTE)

      expect(context.sessionExpiresAt).toBeGreaterThan(Date.now() + 29 * MINUTE)
      expect(instance.updateToken).toHaveBeenCalledWith(-1)
    })

    // Stops listening to other tabs when the page goes away.
    it("stops listening when unmounted", async () => {
      const instance = newInstance()
      Keycloak.mockImplementation(() => instance)
      const { unmount } = render(
        <KeycloakProvider>
          <Consumer />
        </KeycloakProvider>
      )
      await screen.findByText("ready")

      unmount()

      expect(channel.close).toHaveBeenCalled()
    })
  })
})
