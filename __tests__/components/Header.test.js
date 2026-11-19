import React from "react"
import { fireEvent, screen } from "@testing-library/react"
import Header from "components/Header"
import AlertsContextProvider from "components/alerts/AlertsContextProvider"
import {
  renderComponent,
  createStore,
  createHistory,
} from "../testUtilities/testUtils"
import { createState } from "stateUtils"
import { useKeycloak } from "KeycloakContext"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

const triggerEditorMenu = jest.fn()

const renderHeader = () => {
  renderComponent(
    <AlertsContextProvider value="testerrorkey">
      <Header triggerEditorMenu={triggerEditorMenu} />
    </AlertsContextProvider>,
    createStore(createState()),
    createHistory(),
  )
}

describe("<Header />", () => {
  beforeEach(() => triggerEditorMenu.mockClear())

  it("does not show the user name", () => {
    renderHeader()

    expect(screen.queryByText("Foo McBar")).not.toBeInTheDocument()
  })

  it("opens the help menu from Help", () => {
    renderHeader()

    fireEvent.click(screen.getByRole("link", { name: "Help" }))

    expect(triggerEditorMenu).toHaveBeenCalledWith("help")
  })

  it("opens the applications menu from Switch application, after Help", () => {
    renderHeader()

    const help = screen.getByRole("link", { name: "Help" })
    const switchApplication = screen.getByRole("link", {
      name: "Switch application",
    })
    expect(
      help.compareDocumentPosition(switchApplication) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    fireEvent.click(switchApplication)

    expect(triggerEditorMenu).toHaveBeenCalledWith("applications")
  })

  it("signs out from Logout without following the # link", () => {
    const keycloak = { logout: jest.fn() }
    useKeycloak.mockReturnValueOnce({ keycloak })
    renderHeader()

    const notPrevented = fireEvent.click(screen.getByText("Logout"))

    expect(notPrevented).toBe(false)
    expect(keycloak.logout).toHaveBeenCalledTimes(1)
  })
})
