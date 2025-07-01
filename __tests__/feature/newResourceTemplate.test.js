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

  return jest.fn().mockImplementation((config) => {
    return mockKeycloak
  })
})

import { renderApp } from "testUtils"
import { fireEvent, screen } from "@testing-library/react"
import { featureSetup, resourceHeaderSelector } from "featureUtils"

featureSetup()

describe("creating new resource template ", () => {
  it("opens the resource template for the resource", async () => {
    renderApp()

    fireEvent.click(screen.getByText("Linked Data Editor", { selector: "a" }))
    fireEvent.click(screen.getByText("Resource Templates", { selector: "a" }))

    // Click the new resource template button
    fireEvent.click(screen.getByText("New template"))
    await screen.findByText(
      "Resource template",
      {
        selector: resourceHeaderSelector,
      },
      { timeout: 15000 }
    )
  }, 20000)
})
