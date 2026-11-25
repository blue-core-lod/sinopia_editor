export const addTemplateHistory = (resourceTemplate) => ({
  type: "ADD_TEMPLATE_HISTORY",
  payload: resourceTemplate,
})

export const addTemplateHistoryByResult = (result) => ({
  type: "ADD_TEMPLATE_HISTORY_BY_RESULT",
  payload: result,
})

export const addSearchHistory = (
  authorityUri,
  authorityLabel,
  query,
  keycloak,
) => {
  const payload = { authorityUri, authorityLabel, query, keycloak }
  return {
    type: "ADD_SEARCH_HISTORY",
    payload,
  }
}

export const addResourceHistoryByResult = (result) => ({
  type: "ADD_RESOURCE_HISTORY_BY_RESULT",
  payload: result,
})

// Session only: the API has no way to remove a history entry, so the entry
// returns the next time the user's history is loaded.
export const removeResourceHistory = (resourceUri) => ({
  type: "REMOVE_RESOURCE_HISTORY",
  payload: resourceUri,
})

export const removeTemplateHistory = (templateId) => ({
  type: "REMOVE_TEMPLATE_HISTORY",
  payload: templateId,
})
