// Copyright 2019 Stanford University see LICENSE for license
import Keycloak from "keycloak-js"

import Config from "../Config"

import { setUser, removeUser } from "actions/authenticate"
import { addError, clearErrors } from "actions/errors"
import { hasUser } from "selectors/authenticate"
import { loadUserData } from "actionCreators/user"

const keycloak = new Keycloak(
  {
    url: Config.keycloakUrl,
    realm: Config.keycloakRealm,
    clientId: Config.keycloakClientId
  }
)

export const authenticate = () => (dispatch, getState) => {
  if (hasUser(getState())) return Promise.resolve(true)
  // return Auth.currentAuthenticatedUser()
  //   .then((cognitoUser) => {
  //     dispatch(setUser(toUser(cognitoUser)))
  //     dispatch(loadUserData(cognitoUser.username))
  //     return true
  //   })
  //   .catch(() => {
  //     dispatch(removeUser())
  //     return false
  //   })
}

export const signIn = (username, password, errorKey) => (dispatch) => {
  dispatch(clearErrors(errorKey))
  console.log(`In login user: ${username} password ${password}`)
  console.log(`Keycloak url: ${Config.keycloakUrl} ${Config.keycloakRealm} ${Config.keycloakClientId}`)
  keycloak.init()
  return keycloak.login({ redirectUri: 'http://localhost:8888'} )
      .then((keycloak_response) => {
        console.log(`Logged into Keycloak`)
        console.log(keycloak_response)
      })
  // return Auth.signIn(username, password)
  //   .then((cognitoUser) => {
  //     dispatch(setUser(toUser(cognitoUser)))
  //     dispatch(loadUserData(cognitoUser.username))
  //   })
  //   .catch((err) => {
  //     dispatch(addError(errorKey, `Login failed: ${err.message}`))
  //     dispatch(removeUser())
    // })
}

export const signOut = () => (dispatch) =>
  // Auth.signOut()
  //   .then(() => {
  //     dispatch(removeUser())
  //   })
  //   .catch((err) => {
  //     // Not displaying to user as no action user could take.
  //     console.error(err)
  //   })
  console.log(`In signOut`)

// Note: User model can be extended as we add additional attributes to Cognito.
const toUser = (cognitoUser) => ({
  username: cognitoUser.username,
  groups: cognitoUser.signInUserSession.idToken.payload["cognito:groups"] || [],
})
