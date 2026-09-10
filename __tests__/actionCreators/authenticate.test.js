// Copyright 2019 Stanford University see LICENSE for license
import { authenticate, signIn, signOut } from "actionCreators/authenticate"
import configureMockStore from "redux-mock-store"
import thunk from "redux-thunk"
import * as sinopiaApi from "sinopiaApi"
import useAuthenticateStore from "stores/authenticateStore"
import useEditorStore from "stores/editorStore"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

// Still need mock Redux store for non-auth dispatches (clearErrors, loadUserData)
const mockStore = configureMockStore([thunk])

const userData = {
  data: { history: { template: [], resource: [], search: [] } },
}

afterEach(() => {
  useAuthenticateStore.setState({ user: undefined })
})

describe("authenticate", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("user already in state", () => {
    it("does not authenticate", async () => {
      useAuthenticateStore.setState({ user: { username: "havram" } })
      const mockKeycloak = {}
      const store = mockStore({})
      await store.dispatch(authenticate(mockKeycloak))
      expect(store.getActions()).toEqual([])
      // User unchanged
      expect(useAuthenticateStore.getState().user).toEqual({
        username: "havram",
      })
    })
  })

  describe("successful", () => {
    sinopiaApi.fetchUser = jest.fn().mockResolvedValue(userData)
    it("sets user in Zustand store", async () => {
      const mockKeycloak = {
        authenticated: true,
        isTokenExpired: jest.fn(),
        updateToken: jest.fn(),
        login: jest.fn(() => Promise.resolve(true)),
        tokenParsed: {
          preferred_username: "havram",
        },
      }

      const store = mockStore({})
      await store.dispatch(authenticate(mockKeycloak))

      expect(useAuthenticateStore.getState().user).toEqual({
        username: "havram",
        groups: ["blue core"],
      })
      expect(sinopiaApi.fetchUser).toHaveBeenCalledWith("havram")
    })
  })
  describe("failure", () => {
    it("removes user from Zustand store", async () => {
      useAuthenticateStore.setState({
        user: { username: "stale", groups: [] },
      })
      const mockKeycloak = { authenticated: false }
      const store = mockStore({})
      await store.dispatch(authenticate(mockKeycloak))
      expect(useAuthenticateStore.getState().user).toBeUndefined()
    })
  })
})

describe("signIn", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("successful", () => {
    sinopiaApi.fetchUser = jest.fn().mockResolvedValue(userData)
    it("dispatches clearErrors and calls keycloak login", async () => {
      const store = mockStore({})
      const mockKeycloak = {
        login: jest.fn(() => Promise.resolve(true)),
        isTokenExpired: jest.fn(),
        updateToken: jest.fn(),
      }
      await store.dispatch(signIn(mockKeycloak, "testerrorkey"))
      expect(useEditorStore.getState().errors["testerrorkey"]).toEqual([])

      // Simulate redirect back — keycloak now authenticated
      mockKeycloak.authenticated = true
      mockKeycloak.tokenParsed = {
        preferred_username: "havram",
      }
      await store.dispatch(authenticate(mockKeycloak))

      expect(useAuthenticateStore.getState().user).toEqual({
        username: "havram",
        groups: ["blue core"],
      })
      expect(sinopiaApi.fetchUser).toHaveBeenCalledWith("havram")
    })
  })
  describe("failure", () => {
    it("dispatches clearErrors then removes user on failed auth", async () => {
      const store = mockStore({})
      const mockKeycloak = {
        login: jest.fn(() => Promise.resolve(false)),
      }
      await store.dispatch(signIn(mockKeycloak, "testerrorkey"))
      expect(useEditorStore.getState().errors["testerrorkey"]).toEqual([])

      // Simulate user refreshing Sinopia — not authenticated
      await store.dispatch(authenticate(mockKeycloak))
      expect(useAuthenticateStore.getState().user).toBeUndefined()
    })
  })
})

describe("signOut", () => {
  describe("successful", () => {
    it("removes user from Zustand store and calls keycloak logout", async () => {
      useAuthenticateStore.setState({
        user: { username: "havram", groups: ["blue core"] },
      })
      const store = mockStore({})
      const mockKeycloak = {
        logout: jest.fn(() => Promise.resolve(true)),
      }
      await store.dispatch(signOut(mockKeycloak))

      expect(useAuthenticateStore.getState().user).toBeUndefined()
      expect(mockKeycloak.logout).toHaveBeenCalled()
    })
  })
})
