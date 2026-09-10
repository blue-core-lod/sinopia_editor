import { fetchUser, putUserHistory } from "sinopiaApi"
import useAuthenticateStore from "stores/authenticateStore"
import {
  loadTemplateHistory,
  loadSearchHistory,
  loadResourceHistory,
} from "actionCreators/history"
import md5 from "crypto-js/md5"

export const loadUserData = (userId, keycloak) =>
  fetchUser(userId)
    .then((userData) => {
      const templateIds = userData.data.history.template.map(
        (historyItem) => historyItem.payload
      )
      loadTemplateHistory(templateIds)
      const searches = userData.data.history.search.map((historyItem) =>
        JSON.parse(historyItem.payload)
      )
      loadSearchHistory(searches, keycloak)
      const resourceUris = userData.data.history.resource.map(
        (historyItem) => historyItem.payload
      )
      loadResourceHistory(resourceUris)
    })
    .catch((err) => console.error(err))

const addHistory = (historyType, payload, keycloak) => {
  const user = useAuthenticateStore.getState().user
  if (!user || !keycloak) return
  return putUserHistory(
    user.username,
    historyType,
    md5(payload).toString(),
    payload,
    keycloak
  ).catch((err) => console.error(err))
}

export const addTemplateHistory = (templateId, keycloak) =>
  addHistory("template", templateId, keycloak)

export const addResourceHistory = (uri, keycloak) =>
  addHistory("resource", uri, keycloak)

export const addSearchHistory = (authorityUri, query, keycloak) => {
  const payload = JSON.stringify({ authorityUri, query })
  return addHistory("search", payload, keycloak)
}
