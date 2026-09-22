import _ from "lodash"

export const hasRoles = (state) => !_.isEmpty(state.entities.roles)

export const selectRoles = (state) => state.entities.roles

export const noop = () => {}
