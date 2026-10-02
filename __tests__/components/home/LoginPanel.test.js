import React from "react"
import { screen } from "@testing-library/react"
import LoginPanel from "components/home/LoginPanel"
import { useKeycloak } from "KeycloakContext"
import { createState } from "stateUtils"
import { renderComponent, createStore } from "../../testUtilities/testUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn(),
}))

const renderPanel = (keycloakState) => {
  useKeycloak.mockReturnValue({ keycloak: {}, ...keycloakState })
  renderComponent(
    <LoginPanel />,
    createStore(createState({ notAuthenticated: true }))
  )
}

describe("<LoginPanel />", () => {
  it("shows the login button once Keycloak finds no session", () => {
    renderPanel({ initialized: true, authenticated: false })
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument()
  })

  it("hides the login button while Keycloak is still checking", () => {
    renderPanel({ initialized: false, authenticated: false })
    expect(
      screen.queryByRole("button", { name: "Login" })
    ).not.toBeInTheDocument()
  })

  it("hides the login button while a signed-in user is being loaded", () => {
    renderPanel({ initialized: true, authenticated: true })
    expect(
      screen.queryByRole("button", { name: "Login" })
    ).not.toBeInTheDocument()
  })
})
