import React from "react"
import { screen } from "@testing-library/react"
import Header from "components/home/Header"
import {
  renderComponent,
  createStore,
  createHistory,
} from "../../testUtilities/testUtils"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

const renderHeader = () => {
  renderComponent(
    <Header triggerHomePageMenu={jest.fn()} />,
    createStore(createState()),
    createHistory(),
  )
}

describe("<Header /> (home page)", () => {
  it("does not show the user name", () => {
    renderHeader()

    screen.getByText("Logout")
    expect(screen.queryByText("Foo McBar")).not.toBeInTheDocument()
  })

  it("shows the logo lockup with a separate divider and name", () => {
    renderHeader()

    screen.getByAltText("Blue Core Logo")
    expect(screen.getByText("|")).toHaveClass("editor-logo-divider")
    expect(screen.getByText(/^Sinopia/)).toHaveClass("editor-logo-name")
  })
})
