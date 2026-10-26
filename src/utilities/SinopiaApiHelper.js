import Config from "../Config"
import _ from "lodash"

export const checkResp = (resp) => {
  if (resp.ok) return Promise.resolve(resp)
  return resp
    .json()
    .then((errors) => {
      const newError = new Error(apiErrorMessage(errors))
      newError.name = "ApiError"
      throw newError
    })
    .catch((err) => {
      if (err.name === "ApiError") throw err
      throw new Error(`Blue Core API returned ${resp.statusText}`)
    })
}

// The Blue Core API (FastAPI) reports errors as {detail: "message"}, sometimes
// with a title, or as {detail: [{msg, ...}]} for request validation errors. The
// older Sinopia API used [{title, details}].
const apiErrorMessage = (errors) => {
  if (typeof errors.detail === "string")
    return errors.title ? `${errors.title}: ${errors.detail}` : errors.detail
  if (Array.isArray(errors.detail))
    return errors.detail.map((error) => error.msg).join("; ")
  // Assuming only one for now.
  const error = errors[0]
  return error.details ? `${error.title}: ${error.details}` : `${error.title}`
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
      "http://sinopia.io/vocabulary/hasResourceId",
  )
  return resourceIdProperty.values[0].literal
}

export const getJwt = (keycloak) => keycloak.token
