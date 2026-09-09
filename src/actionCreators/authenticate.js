// Copyright 2019 Stanford University see LICENSE for license

import Config from "../Config"

import { clearErrors } from "actions/errors"
import { loadUserData } from "actionCreators/user"
import useAuthenticateStore from "stores/authenticateStore"

export const authenticate = (keycloak) => async (dispatch) => {
  const { user, setUser, removeUser } = useAuthenticateStore.getState()
  if (!keycloak) return Promise.resolve(false)
  if (user && keycloak.authenticated !== false) return Promise.resolve(true)

  if (keycloak.authenticated) {
    if (keycloak.isTokenExpired(30)) {
      await keycloak.updateToken(30)
    }
    const userInfo = keycloak.tokenParsed
    setUser(toUser(userInfo))
    dispatch(loadUserData(userInfo.preferred_username, keycloak))
    return Promise.resolve(true)
  }
  removeUser()
  return Promise.resolve(false)
}

export const signIn =
  (keycloak, errorKey, redirectUri = Config.sinopiaUrl) =>
  (dispatch) => {
    dispatch(clearErrors(errorKey))
    return Promise.resolve(keycloak.login({ redirectUri }))
  }

export const signOut = (keycloak) => () => {
  const { removeUser } = useAuthenticateStore.getState()
  removeUser()
  keycloak.logout({ redirectUri: Config.sinopiaUrl })
}

const toUser = (keycloakUser) => ({
  username: keycloakUser.preferred_username,
  groups: ["blue core"],
})
