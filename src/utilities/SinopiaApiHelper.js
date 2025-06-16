import Config from "../Config"
import _ from "lodash"
import Keycloak from "keycloak-js"

import { initKeycloak } from "../actionCreators/authenticate"


const keycloak = new Keycloak({
  url: Config.keycloakUrl,
  realm: Config.keycloakRealm,
  clientId: Config.keycloakClientId,
})

export const checkResp = (resp) => {
  if (resp.ok) return Promise.resolve(resp)
  return resp
    .json()
    .then((errors) => {
      // Assuming only one for now.
      const error = errors[0]
      const newError = error.details
        ? new Error(`${error.title}: ${error.details}`)
        : new Error(`${error.title}`)
      newError.name = "ApiError"
      throw newError
    })
    .catch((err) => {
      if (err.name === "ApiError") throw err
      throw new Error(`Sinopia API returned ${resp.statusText}`)
    })
}

export const getJson = (url, queryParams = {}) =>
  fetch(urlWithQueryString(url, queryParams), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  })
    .then((resp) => checkResp(resp))
    .then((resp) => resp.json())

const urlWithQueryString = (url, queryParams) => {
  if (_.isEmpty(queryParams)) return url

  return `${url}?${new URLSearchParams(queryParams)}`
}

export const getJsonData = (url) => getJson(url).then((json) => json.data)

export const isTemplate = (resource) =>
  resource.subjectTemplate.id === Config.rootResourceTemplateId

export const templateIdFor = (resource) => {
  const resourceIdProperty = resource.properties.find(
    (property) =>
      property.propertyTemplate.defaultUri ===
      "http://sinopia.io/vocabulary/hasResourceId"
  )
  return resourceIdProperty.values[0].literal
}

export const getJwt = () => {
  const keycloakInititialized = Promise.resolve(initKeycloak())

  if (keycloakInititialized) {
    if (keycloak.authenticated) {
        if (keycloak.isTokenExpired(30)) {
          keycloak.updateToken(30)
        }
    }
    if (!keycloak.token) throw new Error("jwt is undefined")
    return keycloak.token
  }
}
