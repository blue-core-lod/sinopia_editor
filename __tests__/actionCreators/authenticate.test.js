// Copyright 2019 Stanford University see LICENSE for license
import { authenticate, signIn, signOut } from "actionCreators/authenticate"
import configureMockStore from "redux-mock-store"
import thunk from "redux-thunk"
import * as sinopiaApi from "sinopiaApi"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

const mockStore = configureMockStore([thunk])

const userData = {
  data: { history: { template: [], resource: [], search: [] } },
}

describe("authenticate", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("user already in state", () => {
    it("does not authenticate", async () => {
      const mockKeycloak = {}
      const store = mockStore({
        authenticate: { user: { username: "havram" } },
      })
      await store.dispatch(authenticate(mockKeycloak))
      expect(store.getActions()).toEqual([])
    })
  })

  describe("successful", () => {
    sinopiaApi.fetchUser = jest.fn().mockResolvedValue(userData)
    it("dispatches actions to add user", async () => {
      const mockKeycloak = {
        authenticated: true,
        isTokenExpired: jest.fn(),
        updateToken: jest.fn(),
        login: jest.fn(() => Promise.resolve(true)),
        tokenParsed: {
          preferred_username: "havram",
        },
      }

      const store = mockStore({ authenticate: { user: undefined } })
      await store.dispatch(authenticate(mockKeycloak))

      expect(store.getActions()).toHaveAction("SET_USER", {
        username: "havram",
        groups: [],
      })
      expect(sinopiaApi.fetchUser).toHaveBeenCalledWith("havram")
    })
  })
  describe("failure", () => {
    it("dispatches actions to remove user", async () => {
      const mockKeycloak = { authenticated: false }
      const store = mockStore({ authenticate: { user: undefined } })
      await store.dispatch(authenticate(mockKeycloak))
      expect(store.getActions()).toHaveAction("REMOVE_USER")
    })
  })
})

describe("signIn", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("successful", () => {
    sinopiaApi.fetchUser = jest.fn().mockResolvedValue(userData)
    it("dispatches actions to add user", async () => {
      let store = mockStore()
      const mockKeycloak = {
        login: jest.fn(() => Promise.resolve(true)),
        isTokenExpired: jest.fn(),
        updateToken: jest.fn(),
      }
      await store.dispatch(signIn(mockKeycloak, "testerrorkey"))
      // After successful signIn, redirected to Sinopia home-page
      mockKeycloak.authenticated = true
      mockKeycloak.tokenParsed = {
        preferred_username: "havram",
      }
      store = mockStore({ authenticate: { user: undefined } })
      await store.dispatch(authenticate(mockKeycloak))

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
      const mockKeycloak = {
        login: jest.fn(() => Promise.resolve(false)),
      }
      await store.dispatch(signIn(mockKeycloak, "testerrorkey"))
      expect(store.getActions()).toHaveAction("CLEAR_ERRORS", "testerrorkey")

      // SignIn failures happen in Keycloak so can't test failures
      // directly, simulates user refreshing Sinopia
      store = mockStore({ authenticate: { user: undefined } })
      await store.dispatch(authenticate(mockKeycloak))

      expect(store.getActions()).toHaveAction("REMOVE_USER")
    })
  })
})

describe("signOut", () => {
  describe("successful", () => {
    it("dispatches actions to remove user", async () => {
      const store = mockStore()
      const mockKeycloak = {
        logout: jest.fn(() => Promise.resolve(true)),
      }
      await store.dispatch(signOut(mockKeycloak))

      expect(store.getActions()).toHaveAction("REMOVE_USER")
    })
  })
})
