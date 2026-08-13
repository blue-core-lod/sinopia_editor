import React from "react"
import { createStore, renderComponent } from "testUtils"
import { screen } from "@testing-library/react"
import { createState } from "stateUtils"
import NestedResourceActionButtons from "components/editor/property/NestedResourceActionButtons"

let mockKeycloak

jest.mock("keycloak-js", () => {
  mockKeycloak = {
    init: jest.fn(() => Promise.resolve(true)),
    token: "Secret-Token",
    authenticated: true,
    isTokenExpired: jest.fn(),
    updateToken: jest.fn(),
    tokenParsed: {
      preferred_username: "Foo McBar",
    },
  }

  return jest.fn().mockImplementation(() => {
    return mockKeycloak
  })
})

describe("<NestedResourceActionButtons />", () => {
  it("renders a reset button", () => {
    const state = createState({ hasResourceWithNestedResource: true })
    const store = createStore(state)

    // Value "VDOeQCnFA8" is a subject value in the nested resource fixture
    const value = state.entities.values.VDOeQCnFA8

    renderComponent(<NestedResourceActionButtons value={value} />, store)

    const resetButton = screen.getByTestId("Reset Uber template2")
    expect(resetButton).toBeInTheDocument()
  })
})
