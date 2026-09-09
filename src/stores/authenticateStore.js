import { create } from "zustand"

const useAuthenticateStore = create((set) => ({
  user: undefined,

  setUser: (user) => set({ user: { ...user } }),

  removeUser: () => set({ user: undefined }),
}))

export default useAuthenticateStore
