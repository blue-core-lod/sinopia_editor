// Copyright 2019 Stanford University see LICENSE for license
import {
  addTemplateHistoryByResult,
  addSearchHistory,
  addResourceHistoryByResult,
  addResourceHistory as addResourceHistoryAction,
} from "actions/history"
import {
  getTemplateSearchResultsByIds,
  getSearchResultsByUris,
} from "sinopiaSearch"
import _ from "lodash"
import {
  findAuthorityConfig,
  sinopiaSearchUri,
} from "utilities/authorityConfig"

export const loadTemplateHistory = (templateIds) => (dispatch) => {
  if (_.isEmpty(templateIds)) return
  getTemplateSearchResultsByIds(templateIds)
    .then((response) => {
      if (response.error) {
        console.error(response.error)
        return
      }
      const resultMap = {}
      response.results.forEach((result) => (resultMap[result.id] = result))
      // Reversing so that most recent is at top of list.
      const reversedTemplateIds = [...templateIds].reverse()
      reversedTemplateIds.forEach((templateId) => {
        const result = resultMap[templateId]
        if (!result) return
        dispatch(addTemplateHistoryByResult(result))
      })
    })
    .catch((err) => console.error(err))
}

export const loadSearchHistory = (searches, keycloak) => (dispatch) => {
  if (_.isEmpty(searches)) return
  searches.reverse().forEach((search) => {
    // Only Sinopia searches can be replayed; skip history saved against
    // external (QA) authorities, which are no longer searchable.
    if (search.authorityUri !== sinopiaSearchUri) return
    const authorityConfig = findAuthorityConfig(search.authorityUri)
    if (!authorityConfig) return

    dispatch(
      addSearchHistory(
        search.authorityUri,
        authorityConfig.label,
        search.query,
        keycloak,
      ),
    )
  })
}

export const loadResourceHistory = (resourceUris) => (dispatch) => {
  if (_.isEmpty(resourceUris)) return
  getSearchResultsByUris(resourceUris)
    .then((response) => {
      if (response.error) {
        console.error(response.error)
        return
      }
      const resultMap = {}
      response.results.forEach((result) => (resultMap[result.uri] = result))
      // Reversing so that most recent is at top of list.
      const reversedResourceUris = [...resourceUris].reverse()
      reversedResourceUris.forEach((resourceUri) => {
        const result = resultMap[resourceUri]
        if (!result) return
        dispatch(addResourceHistoryByResult(result))
      })
    })
    .catch((err) => console.error(err))
}

const templateValueFor = (resource, propertyUri) =>
  resource.properties.find(
    (property) => property.propertyTemplate.defaultUri === propertyUri,
  )?.values?.[0]

// Builds the same shape as a template search result from the template
// resource itself, for a template the search index does not have yet.
const templateResultFor = (resource, templateId) => ({
  id: templateId,
  resourceLabel: templateValueFor(
    resource,
    "http://www.w3.org/2000/01/rdf-schema#label",
  )?.literal,
  resourceURI: templateValueFor(
    resource,
    "http://sinopia.io/vocabulary/hasClass",
  )?.uri,
  uri: resource.uri,
  author: templateValueFor(resource, "http://sinopia.io/vocabulary/hasAuthor")
    ?.literal,
  remark: templateValueFor(resource, "http://sinopia.io/vocabulary/hasRemark")
    ?.literal,
  date: templateValueFor(resource, "http://sinopia.io/vocabulary/hasDate")
    ?.literal,
  group: resource.group,
  editGroups: resource.editGroups,
})

export const templateIdForResource = (resource) =>
  templateValueFor(resource, "http://sinopia.io/vocabulary/hasResourceId")
    ?.literal

export const addTemplateHistoryForResource =
  (resource, templateId) => (dispatch) =>
    // Try to find it by search. If not available, just use the resource.
    getTemplateSearchResultsByIds([templateId])
      .then((response) => {
        if (response.error) {
          console.error(response.error)
          return
        }
        const result = response.results.find(
          (checkResult) => checkResult.id === templateId,
        )
        dispatch(
          addTemplateHistoryByResult(
            result || templateResultFor(resource, templateId),
          ),
        )
      })
      .catch((err) => console.error(err))

export const addResourceHistory =
  (resourceUri, type, group, modified) => (dispatch) => {
    // Try to find it by search. If not available, just use the resource.
    getSearchResultsByUris([resourceUri])
      .then((response) => {
        if (response.error) {
          console.error(response.error)
          return
        }
        if (response.results.length !== 1) {
          dispatch(
            addResourceHistoryAction(
              resourceUri,
              type,
              group,
              modified || new Date().toISOString(),
            ),
          )
        } else {
          dispatch(addResourceHistoryByResult(response.results[0]))
        }
      })
      .catch((err) => console.error(err))
  }
