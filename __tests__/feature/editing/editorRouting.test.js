import { renderApp, createHistory, createStore } from "testUtils"
import { screen, waitFor } from "@testing-library/react"
import { featureSetup, resourceHeaderSelector } from "featureUtils"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

featureSetup()

const blueCoreWorkUri =
  "http://localhost:3000/works/d4e1b2a3-5c6f-4a7b-8c9d-0e1f2a3b4c5d"

describe("routing in editor", () => {
  describe("/editor", () => {
    const history = createHistory(["/editor"])

    it("redirects to /dashboard", async () => {
      renderApp(null, history)

      expect(history.location.pathname).toEqual("/dashboard")
    })
  })

  describe("/editor/:templateId when user has create permissions", () => {
    const history = createHistory(["/editor/resourceTemplate:testing:uber1"])

    it("opens a new resource in editor", async () => {
      renderApp(null, history)

      await waitFor(() =>
        expect(history.location.pathname).toEqual(
          "/editor/resourceTemplate:testing:uber1"
        )
      )

      await screen.findByText("Uber template1", {
        selector: resourceHeaderSelector,
      })
    }, 10000)
  })

  describe("/editor/:templateId when user does not have create permissions", () => {
    const history = createHistory(["/editor/resourceTemplate:testing:uber1"])
    const state = createState()
    state.authenticate.user.groups = []
    const store = createStore(state)

    it("redirects to dashboard", async () => {
      renderApp(store, history)

      await waitFor(() =>
        expect(history.location.pathname).toEqual("/dashboard")
      )
    })
  })

  describe("/editor/:templateId when an error", () => {
    const history = createHistory(["/editor/not:a:template"])

    it("redirects to templates and displays error", async () => {
      renderApp(null, history)

      await waitFor(() =>
        expect(history.location.pathname).toEqual("/templates")
      )

      await screen.findByText(/Not found/, { selector: ".alert p" })
    })
  })

  // The fixture resource URI is http://localhost:3000/resource/<uuid>, so its
  // collection is "resource"; a Blue Core work would be /editor/resource/works/<uuid>.
  describe("/editor/resource/:collection/:id when user has edit permissions", () => {
    const history = createHistory([
      "/editor/resource/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3f",
    ])

    it("opens existing resource in editor", async () => {
      renderApp(null, history)

      await waitFor(() =>
        expect(history.location.pathname).toEqual(
          "/editor/resource/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3f"
        )
      )

      await screen.findByText("Example Label", {
        selector: resourceHeaderSelector,
      })
    }, 10000)
  })

  describe("/editor/resource/:collection/:id for a Blue Core work", () => {
    const history = createHistory([
      "/editor/resource/works/d4e1b2a3-5c6f-4a7b-8c9d-0e1f2a3b4c5d",
    ])

    it("rebuilds the work URI and opens it in editor", async () => {
      renderApp(null, history)

      await screen.findAllByText(`URI for this resource: <${blueCoreWorkUri}>`)
      expect(history.location.pathname).toEqual(
        "/editor/resource/works/d4e1b2a3-5c6f-4a7b-8c9d-0e1f2a3b4c5d"
      )
    }, 10000)
  })

  describe("deep link to a Blue Core work", () => {
    // Regression: the route ID used to be sliced off the URI at the length of
    // `${sinopiaApiBase}/resource/`, yielding e.g. /editor/resource/orks/<uuid>.
    const history = createHistory([`/dashboard?resource=${blueCoreWorkUri}`])

    it("shows collection/uuid in the editor route", async () => {
      renderApp(null, history)

      await screen.findAllByText(`URI for this resource: <${blueCoreWorkUri}>`)
      await waitFor(() =>
        expect(history.location.pathname).toEqual(
          "/editor/resource/works/d4e1b2a3-5c6f-4a7b-8c9d-0e1f2a3b4c5d"
        )
      )
    }, 10000)
  })

  describe("/editor/resource/:collection/:id when user does not have edit permissions", () => {
    const history = createHistory([
      "/editor/resource/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3f",
    ])
    const state = createState()
    state.authenticate.user.groups = []
    const store = createStore(state)

    it("opens existing resource in preview", async () => {
      renderApp(store, history)

      await waitFor(() =>
        expect(history.location.pathname).toEqual("/dashboard")
      )

      await screen.findByText("Preview Resource", { selector: "h4" })
    }, 15000)
  })

  describe("/editor/resource/:collection/:id when an error", () => {
    const history = createHistory(["/editor/resource/resource/ld4p:RT:bf2:xxx"])

    it("redirects to dashboard and displays error", async () => {
      renderApp(null, history)

      await waitFor(() =>
        expect(history.location.pathname).toEqual("/dashboard")
      )

      await screen.findByText(/Not Found/, { selector: ".alert p" })
    }, 10000)
  })
})
