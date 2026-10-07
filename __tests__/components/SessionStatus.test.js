import React from "react"
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import SessionStatus from "components/SessionStatus"
import { useKeycloak } from "KeycloakContext"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn(),
  SESSION_WARNING_MS: 5 * 60 * 1000,
}))

const MINUTE = 60 * 1000

const renderStatus = ({
  msLeft = null,
  sessionExpired = false,
  expAfterExtend = null,
  extendFails = false,
} = {}) => {
  const keycloak = { login: jest.fn(), timeSkew: 0 }
  const sessionExpiresAt = msLeft === null ? null : Date.now() + msLeft
  if (sessionExpiresAt)
    keycloak.refreshTokenParsed = { exp: sessionExpiresAt / 1000 }
  const extendSession = jest.fn().mockImplementation(() => {
    if (extendFails) return Promise.resolve(false)
    if (expAfterExtend)
      keycloak.refreshTokenParsed = { exp: expAfterExtend / 1000 }
    return Promise.resolve(true)
  })
  useKeycloak.mockReturnValue({
    keycloak,
    sessionExpiresAt,
    sessionExpired,
    extendSession,
  })
  render(
    <ul>
      <SessionStatus />
    </ul>,
  )
  return { keycloak, extendSession }
}

describe("<SessionStatus />", () => {
  it("renders nothing when not signed in", () => {
    renderStatus()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders nothing while more than 5 minutes are left", () => {
    renderStatus({ msLeft: 30 * MINUTE })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("warns with a countdown when 5 minutes or less are left", () => {
    renderStatus({ msLeft: 4 * MINUTE + 30 * 1000 })
    expect(screen.getByText("Your session is about to end")).toBeInTheDocument()
    expect(screen.getByText("4:30")).toBeInTheDocument()
  })

  it("extends the session when the user clicks Continue", async () => {
    const { extendSession } = renderStatus({
      msLeft: 2 * MINUTE,
      expAfterExtend: Date.now() + 180 * MINUTE,
    })

    fireEvent.click(screen.getByRole("button", { name: "Continue" }))

    expect(extendSession).toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled(),
    )
    expect(screen.queryByText(/can't be extended/)).not.toBeInTheDocument()
  })

  it("explains when the session can't be extended any further", async () => {
    renderStatus({
      msLeft: 2 * MINUTE,
      expAfterExtend: Date.now() + 2 * MINUTE,
    })

    fireEvent.click(screen.getByRole("button", { name: "Continue" }))

    await screen.findByText(/can't be extended any further/)
    expect(
      screen.queryByRole("button", { name: "Continue" }),
    ).not.toBeInTheDocument()
  })

  // At the session's maximum length, the user can close the warning to save.
  it("lets the user close the warning when it can't be extended", async () => {
    renderStatus({
      msLeft: 2 * MINUTE,
      expAfterExtend: Date.now() + 2 * MINUTE,
    })

    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    fireEvent.click(await screen.findByRole("button", { name: "Close" }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  // A failed refresh (e.g. network error) isn't the session limit.
  it("keeps Continue available when the refresh fails", async () => {
    const { extendSession } = renderStatus({
      msLeft: 2 * MINUTE,
      extendFails: true,
    })

    fireEvent.click(screen.getByRole("button", { name: "Continue" }))

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled(),
    )
    expect(screen.queryByText(/can't be extended/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(extendSession).toHaveBeenCalledTimes(2)
  })

  // With a short timeout, Continue still works even if under 5 minutes are left.
  it("does not say it can't be extended when the end time moved", async () => {
    renderStatus({
      msLeft: 1 * MINUTE,
      expAfterExtend: Date.now() + 4 * MINUTE,
    })

    fireEvent.click(screen.getByRole("button", { name: "Continue" }))

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled(),
    )
    expect(screen.queryByText(/can't be extended/)).not.toBeInTheDocument()
  })

  it("prompts to log back in once the session has ended", () => {
    const { keycloak } = renderStatus({
      msLeft: 60 * MINUTE,
      sessionExpired: true,
    })

    const dialog = screen.getByRole("dialog")
    expect(
      within(dialog).getByText("You have been logged out"),
    ).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Log back in" }))
    expect(keycloak.login).toHaveBeenCalledWith({
      redirectUri: window.location.href,
    })
  })

  it("treats a session past its end time as ended", () => {
    renderStatus({ msLeft: -1000 })
    expect(screen.getByText("You have been logged out")).toBeInTheDocument()
  })

  it("keeps a logged out banner after the prompt is dismissed", () => {
    const { keycloak } = renderStatus({ sessionExpired: true })

    fireEvent.click(screen.getByRole("button", { name: "Not now" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    const banner = screen.getByRole("alert")
    expect(banner).toHaveTextContent("You are logged out")
    fireEvent.click(within(banner).getByRole("button", { name: "Log back in" }))
    expect(keycloak.login).toHaveBeenCalled()
  })

  it("shows no logged out banner while signed in", () => {
    renderStatus({ msLeft: 30 * MINUTE })
    expect(screen.queryByText(/You are logged out/)).not.toBeInTheDocument()
  })
})
