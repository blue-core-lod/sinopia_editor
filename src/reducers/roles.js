export const rolesReceived = (state, action) => ({
  ...state,
  roles: action.payload,
})

export const noop = () => {}
