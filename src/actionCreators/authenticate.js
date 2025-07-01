// Copyright 2019 Stanford University see LICENSE for license
import Keycloak from "keycloak-js"

import Config from "../Config"

import { setUser, removeUser } from "actions/authenticate"
import { addError, clearErrors } from "actions/errors"
import { hasUser } from "selectors/authenticate"
import { loadUserData } from "actionCreators/user"

const keycloak = new Keycloak({
  url: Config.keycloakUrl,
  realm: Config.keycloakRealm,
  clientId: Config.keycloakClientId,
})

let initializationPromise = null

export const initKeycloak = () => {
  if (!initializationPromise) {
    initializationPromise = keycloak.init()
  }
  return initializationPromise
}

export const authenticate = () => async (dispatch, getState) => {
  if (hasUser(getState())) return Promise.resolve(true)

  const keycloakInititialized = await initKeycloak()

  if (keycloakInititialized) {
    if (keycloak.isTokenExpired(30)) {
      await keycloak.updateToken(30)
    }
    if (keycloak.authenticated) {
      const userInfo = keycloak.tokenParsed
      dispatch(setUser(toUser(userInfo)))
      dispatch(loadUserData(userInfo.preferred_username))

      return Promise.resolve(true)
    }
  }
  dispatch(removeUser())
  return Promise.resolve(false)
}

export const signIn = (username, password, errorKey) => (dispatch) => {
  dispatch(clearErrors(errorKey))

  const keycloakInititialized = Promise.resolve(initKeycloak())

  if (keycloakInititialized) {
    return Promise.resolve(keycloak.login({ redirectUri: Config.sinopiaUrl }))
  }
}

export const signOut = () => (dispatch) => {
  const keycloakInititialized = Promise.resolve(initKeycloak())

  if (keycloakInititialized) {
    // Keycloak logout uses GET to load window and then redirects
    // to Sinopia home page and doesn't return any object
    dispatch(removeUser())
    keycloak.logout({ redirectUri: Config.sinopiaUrl })
  }
}

const toUser = (keycloakUser) => ({
  username: keycloakUser.preferred_username,
  groups: [], // This needs to be a separate call to the api
})
