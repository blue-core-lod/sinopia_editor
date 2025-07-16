// Copyright 2019 Stanford University see LICENSE for license
// import Keycloak from "keycloak-js"

import Config from "../Config"

import { setUser, removeUser } from "actions/authenticate"
import { addError, clearErrors } from "actions/errors"
import { hasUser } from "selectors/authenticate"
import { loadUserData } from "actionCreators/user"

export const authenticate = (keycloak) => async (dispatch, getState) => {
  if (hasUser(getState())) return Promise.resolve(true)

  if (keycloak.authenticated) {
    if (keycloak.isTokenExpired(30)) {
      await keycloak.updateToken(30)
    }
    const userInfo = keycloak.tokenParsed
    dispatch(setUser(toUser(userInfo)))
    dispatch(loadUserData(userInfo.preferred_username))
    return Promise.resolve(true)
  }
  dispatch(removeUser())
  return Promise.resolve(false)
}

export const signIn = (keycloak, errorKey) => (dispatch) => {
  dispatch(clearErrors(errorKey))
  return Promise.resolve(keycloak.login({ redirectUri: Config.sinopiaUrl }))
}

export const signOut = (keycloak) => (dispatch) => {
  // Keycloak logout uses GET to load window and then redirects
  // to Sinopia home page and doesn't return any object
  dispatch(removeUser())
  keycloak.logout({ redirectUri: Config.sinopiaUrl })
}

const toUser = (keycloakUser) => ({
  username: keycloakUser.preferred_username,
  groups: [], // This needs to be a separate call to the api
})
