// Copyright 2019 Stanford University see LICENSE for license
import {
  getTemplateSearchResultsByIds,
  getSearchResultsByUris,
} from "sinopiaSearch"
import _ from "lodash"
import { findAuthorityConfig } from "utilities/authorityConfig"
import useHistoryStore from "stores/historyStore"

export const loadTemplateHistory = (templateIds) => () => {
  if (_.isEmpty(templateIds)) return
  getTemplateSearchResultsByIds(templateIds)
    .then((response) => {
      if (response.error) {
        console.error(response.error)
        return
      }
      const resultMap = {}
      response.results.forEach((result) => (resultMap[result.id] = result))
      const reversedTemplateIds = [...templateIds].reverse()
      reversedTemplateIds.forEach((templateId) => {
        const result = resultMap[templateId]
        if (!result) return
        useHistoryStore.getState().addTemplateHistoryByResult(result)
      })
    })
    .catch((err) => console.error(err))
}

export const loadSearchHistory = (searches) => () => {
  if (_.isEmpty(searches)) return
  searches.reverse().forEach((search) => {
    const authorityConfig = findAuthorityConfig(search.authorityUri)
    if (!authorityConfig) return

    useHistoryStore.getState().addSearchHistory({
      authorityUri: search.authorityUri,
      authorityLabel: authorityConfig.label,
      query: search.query,
    })
  })
}

export const loadResourceHistory = (resourceUris) => () => {
  if (_.isEmpty(resourceUris)) return
  getSearchResultsByUris(resourceUris)
    .then((response) => {
      if (response.error) {
        console.error(response.error)
        return
      }
      const resultMap = {}
      response.results.forEach((result) => (resultMap[result.uri] = result))
      const reversedResourceUris = [...resourceUris].reverse()
      reversedResourceUris.forEach((resourceUri) => {
        const result = resultMap[resourceUri]
        if (!result) return
        useHistoryStore.getState().addResourceHistoryByResult(result)
      })
    })
    .catch((err) => console.error(err))
}

export const addResourceHistory =
  (resourceUri, type, group, modified) => () => {
    getSearchResultsByUris([resourceUri])
      .then((response) => {
        if (response.error) {
          console.error(response.error)
          return
        }
        if (response.results.length !== 1) {
          useHistoryStore.getState().addResourceHistory({
            resourceUri,
            type,
            group,
            modified: modified || new Date().toISOString(),
          })
        } else {
          useHistoryStore
            .getState()
            .addResourceHistoryByResult(response.results[0])
        }
      })
      .catch((err) => console.error(err))
  }
