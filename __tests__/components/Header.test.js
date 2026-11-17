import React from "react"
import { fireEvent, screen } from "@testing-library/react"
import Header from "components/Header"
import { createStore, renderComponent } from "testUtils"
import { createState } from "stateUtils"
import { selectUser } from "selectors/authenticate"
import { useKeycloak } from "KeycloakContext"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn(),
}))

jest.mock(
  "components/SessionStatus",
  () =>
    function SessionStatus() {
      return null
    },
)

describe("<Header />", () => {
  const keycloak = { logout: jest.fn() }

  beforeEach(() => {
    keycloak.logout.mockClear()
    useKeycloak.mockReturnValue({ keycloak })
  })

  it("renders the shared Blue Core header for Sinopia", () => {
    renderComponent(<Header />)

    const header = screen.getByTestId("bluecore-header")
    expect(header).toHaveAttribute("app-name", "SINOPIA")
    expect(header).toHaveAttribute("current-app", "sinopia")
    expect(header).toHaveAttribute("logout", "")
  })

  it("leaves out Logout and Help when no one is signed in", () => {
    const store = createStore(createState({ notAuthenticated: true }))
    renderComponent(<Header />, store)

    expect(screen.getByTestId("bluecore-header")).not.toHaveAttribute("logout")
    expect(
      screen.queryByRole("button", { name: "Help" }),
    ).not.toBeInTheDocument()
  })

  it("signs out when the shared header fires bluecore-logout", () => {
    const store = createStore()
    renderComponent(<Header />, store)

    fireEvent(
      screen.getByTestId("bluecore-header"),
      new CustomEvent("bluecore-logout", { bubbles: true }),
    )

    expect(keycloak.logout).toHaveBeenCalledTimes(1)
    expect(selectUser(store.getState())).toBeUndefined()
  })

  it("opens the help menu from the Help button", () => {
    const triggerEditorMenu = jest.fn()
    renderComponent(<Header triggerEditorMenu={triggerEditorMenu} />)

    fireEvent.click(screen.getByRole("button", { name: "Help" }))

    expect(triggerEditorMenu).toHaveBeenCalledTimes(1)
  })
})
