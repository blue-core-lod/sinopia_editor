export const hasUser = (state) => !!state.authenticate.user

export const selectUser = (state) => state.authenticate.user

export const selectGroups = (state) => state.authenticate.user?.groups

// Stable reference so useSelector() does not see a new array on every render.
const noRoles = []

export const selectRoles = (state) => state.authenticate.user?.roles ?? noRoles
