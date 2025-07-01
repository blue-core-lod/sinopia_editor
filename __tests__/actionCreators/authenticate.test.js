// Copyright 2019 Stanford University see LICENSE for license
let mockKeycloak

jest.mock("keycloak-js", () => {
  mockKeycloak = {
    init: jest.fn(() => Promise.resolve(true)),
    isTokenExpired: jest.fn(),
    updateToken: jest.fn(),
    login: jest.fn(() => Promise.resolve(true)),
    logout: jest.fn(() => Promise.resolve(true)),
    authenticated: false,
  }

  return jest.fn().mockImplementation((config) => {
    return mockKeycloak
  })
})

import { authenticate, signIn, signOut } from "actionCreators/authenticate"
import configureMockStore from "redux-mock-store"
import thunk from "redux-thunk"
import * as sinopiaApi from "sinopiaApi"

const mockStore = configureMockStore([thunk])

const userData = {
  data: { history: { template: [], resource: [], search: [] } },
}

describe("authenticate", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockKeycloak.authenticated = false
  })

  describe("user already in state", () => {
    it("does not authenticate", async () => {
      const store = mockStore({
        authenticate: { user: { username: "havram" } },
      })
      await store.dispatch(authenticate())
      expect(store.getActions()).toEqual([])
    })
  })

  describe("successful", () => {
    sinopiaApi.fetchUser = jest.fn().mockResolvedValue(userData)
    it("dispatches actions to add user", async () => {
      mockKeycloak.authenticated = true
      mockKeycloak.tokenParsed = {
        preferred_username: "havram",
      }
      const store = mockStore({ authenticate: { user: undefined } })
      await store.dispatch(authenticate())

      expect(store.getActions()).toHaveAction("SET_USER", {
        username: "havram",
        groups: [],
      })
      expect(sinopiaApi.fetchUser).toHaveBeenCalledWith("havram")
    })
  })
  describe("failure", () => {
    it("dispatches actions to remove user", async () => {
      const store = mockStore({ authenticate: { user: undefined } })
      await store.dispatch(authenticate())
      expect(store.getActions()).toHaveAction("REMOVE_USER")
    })
  })
})

describe("signIn", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockKeycloak.authenticated = false
  })

  describe("successful", () => {
    sinopiaApi.fetchUser = jest.fn().mockResolvedValue(userData)
    it("dispatches actions to add user", async () => {
      let store = mockStore()
      await store.dispatch(signIn("havram", "m&rc", "testerrorkey"))
      // After successful signIn, redirected to Sinopia home-page
      mockKeycloak.authenticated = true
      mockKeycloak.tokenParsed = {
        preferred_username: "havram",
      }
      store = mockStore({ authenticate: { user: undefined } })
      await store.dispatch(authenticate())

      expect(store.getActions()).toHaveAction("SET_USER", {
        username: "havram",
        groups: [],
      })
      expect(sinopiaApi.fetchUser).toHaveBeenCalledWith("havram")
    })
  })
  describe("failure", () => {
    it("dispatches actions to remove user", async () => {
      let store = mockStore()
      await store.dispatch(signIn("mdewey", "amh&rst", "testerrorkey"))
      expect(store.getActions()).toHaveAction("CLEAR_ERRORS", "testerrorkey")

      // SignIn failures happen in Keycloak so can't test failures
      // directly, simulates user refreshing Sinopia
      store = mockStore({ authenticate: { user: undefined } })
      await store.dispatch(authenticate())

      expect(store.getActions()).toHaveAction("REMOVE_USER")
    })
  })
})

describe("signOut", () => {
  describe("successful", () => {
    it("dispatches actions to remove user", async () => {
      const store = mockStore()
      await store.dispatch(signOut())

      expect(store.getActions()).toHaveAction("REMOVE_USER")
    })
  })
})
