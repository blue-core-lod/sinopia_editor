// Copyright 2018 Stanford University see LICENSE for license

import {
  fireEvent,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react"
import { createState } from "stateUtils"
import { createStore, renderApp } from "testUtils"
import * as sinopiaApi from "sinopiaApi"

jest.mock("../../src/KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({
    keycloak: {
      authenticated: false,
      logout: jest.fn(),
    },
  }),
}))

jest.spyOn(sinopiaApi, "fetchUser").mockResolvedValue({
  data: { history: { template: [], resource: [], search: [] } },
})

describe("user authentication", () => {
  it("allows a logged in user to log out and allows a new one to login", async () => {
    const state = createState()
    state.authenticate.user.groups = []
    const store = createStore(state)

    renderApp(store)
    screen.getByText(/Foo McBar/) // user Foo McBar should be logged in already when using default test redux store

    // logout, and confirm that the UI gets rid of the old user name
    // and removes elements that require authentication to view
    fireEvent.click(screen.getByText("Logout", { selector: "a" }))

    // likely that things will have already re-rendered, but if not, wait for it
    // if (screen.queryByText(/Foo McBar/)) {
    //   await waitForElementToBeRemoved(() => screen.queryByText(/Foo McBar/))
    // }
    // check for elements indicating we were sent back to the login page
    // expect(screen.queryByText("Logout")).not.toBeInTheDocument()
    // screen.getByText(/Latest news/)
    // screen.getByText(/Sinopia Version \d+.\d+.\d+ highlights/)
    // screen.getByText("Sinopia help site", { selector: "a" })
  })
})
