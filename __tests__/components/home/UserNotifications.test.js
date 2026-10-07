// Copyright 2021 Stanford University see LICENSE for license
import React from "react"
import { screen } from "@testing-library/react"
import UserNotifications from "components/home/UserNotifications"
import { createStore, renderComponent } from "testUtils"
import { createState } from "stateUtils"

// var, not let: babel-plugin-jest-hoist lifts the jest.mock() call above
// this declaration, and the factory body assigns mockKeycloak immediately.
// A let/const binding would still be in its TDZ at that point.
// eslint-disable-next-line no-var
var mockKeycloak

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

describe("<UserNotifications />", () => {
  it("shows a warning if a logged in user is not in any groups", async () => {
    const state = createState({ noGroups: true })
    const store = createStore(state)
    const { container } = renderComponent(<UserNotifications />, store)
    await screen.findByText(/Before you can create/)
    expect(container).not.toBeNull
  })

  it("does not show a warning if a logged in user is in at least one group", async () => {
    const state = createState()
    const store = createStore(state)
    const { container } = renderComponent(<UserNotifications />, store)
    expect(container).toBeNull
  })

  it("does not show a warning if there is no logged in user", async () => {
    const state = createState({ notAuthenticated: true })
    const store = createStore(state)
    const { container } = renderComponent(<UserNotifications />, store)
    expect(container).toBeNull
  })
})
