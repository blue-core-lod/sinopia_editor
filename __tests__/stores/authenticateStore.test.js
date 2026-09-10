import useAuthenticateStore from "stores/authenticateStore"

// Reset store between tests
afterEach(() => {
  useAuthenticateStore.setState({ user: undefined })
})

describe("authenticateStore", () => {
  describe("initial state", () => {
    it("has no user", () => {
      const state = useAuthenticateStore.getState()
      expect(state.user).toBeUndefined()
    })
  })

  describe("setUser", () => {
    it("sets the user", () => {
      const user = { username: "havram", groups: ["blue core"] }
      useAuthenticateStore.getState().setUser(user)
      expect(useAuthenticateStore.getState().user).toEqual(user)
    })
  })

  describe("removeUser", () => {
    it("clears the user", () => {
      useAuthenticateStore.setState({
        user: { username: "havram", groups: ["blue core"] },
      })
      useAuthenticateStore.getState().removeUser()
      expect(useAuthenticateStore.getState().user).toBeUndefined()
    })
  })
})
