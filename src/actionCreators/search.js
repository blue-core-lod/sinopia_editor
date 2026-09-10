// Copyright 2019 Stanford University see LICENSE for license
import useSearchStore from "stores/searchStore"
import {
  getSearchResultsWithFacets,
  getTemplateSearchResults,
} from "sinopiaSearch"
import { createLookupPromise } from "utilities/QuestioningAuthority"
import {
  findAuthorityConfig,
  sinopiaSearchUri,
} from "utilities/authorityConfig"
import { addSearchHistory as addApiSearchHistory } from "actionCreators/user"
import useHistoryStore from "stores/historyStore"
import useEditorStore from "stores/editorStore"
import { isBfWorkInstanceItem } from "utilities/Bibframe"
import { loadSearchRelationships } from "./relationships"

const computeSearchFacets = (results) => {
  if (!results?.length) return {}
  const typeCounts = {}
  const groupCounts = {}
  results.forEach(({ type, group }) => {
    type?.forEach((t) => {
      typeCounts[t] = (typeCounts[t] || 0) + 1
    })
    if (group) groupCounts[group] = (groupCounts[group] || 0) + 1
  })
  return {
    types: Object.entries(typeCounts).map(([key, doc_count]) => ({
      key,
      doc_count,
    })),
    groups: Object.entries(groupCounts).map(([key, doc_count]) => ({
      key,
      doc_count,
    })),
  }
}

export const fetchSinopiaSearchResults = (
  query,
  options,
  errorKey,
  keycloak
) => {
  useEditorStore.getState().clearErrors(errorKey)
  return getSearchResultsWithFacets(query, options, keycloak).then(
    ([response, facetResponse]) => {
      useHistoryStore.getState().addSearchHistory({
        authorityUri: sinopiaSearchUri,
        authorityLabel: "Sinopia resources",
        query,
        keycloak,
      })
      addApiSearchHistory(sinopiaSearchUri, query, keycloak)
      // Use extracted options from response if available, otherwise use passed options
      const finalOptions = response.options || options
      const facets =
        facetResponse && Object.keys(facetResponse).length
          ? facetResponse
          : computeSearchFacets(response.results)
      useSearchStore
        .getState()
        .setSearchResults(
          "resource",
          sinopiaSearchUri,
          response.results,
          response.totalHits,
          facets,
          query,
          finalOptions,
          response.error,
          response.links
        )
      if (response.results) {
        response.results
          .filter((result) => isBfWorkInstanceItem(result.type))
          .forEach((result) => {
            loadSearchRelationships(result.uri, errorKey)
          })
      }
      if (response.error) {
        useEditorStore
          .getState()
          .addError(
            errorKey,
            `An error occurred while searching: ${response.error.toString()}`
          )
        return false
      }
      return true
    }
  )
}

export const fetchQASearchResults = (query, uri, errorKey, options = {}) => {
  const authorityConfig = findAuthorityConfig(uri)
  const searchPromise = createLookupPromise(query, authorityConfig, options)

  useEditorStore.getState().clearErrors(errorKey)
  return searchPromise.then((response) => {
    if (response.isError) {
      useSearchStore
        .getState()
        .setSearchResults(
          "resource",
          uri,
          [],
          0,
          {},
          query,
          options,
          response.errorObject.message
        )
      useEditorStore
        .getState()
        .addError(
          errorKey,
          `An error occurred while searching: ${response.errorObject.message}`
        )
      return false
    }
    useHistoryStore.getState().addSearchHistory({
      authorityUri: uri,
      authorityLabel: authorityConfig.label,
      query,
    })
    addApiSearchHistory(uri, query)
    useSearchStore
      .getState()
      .setSearchResults(
        "resource",
        uri,
        response.results,
        response.response_header.total_records,
        {},
        query,
        options
      )
    return true
  })
}

// These will be used as suggestions to the user when the user performs a Sinopia search.
export const fetchTemplateGuessSearchResults = (
  queryString,
  errorKey,
  options = {}
) =>
  getTemplateSearchResults(queryString, options).then((response) => {
    useSearchStore
      .getState()
      .setSearchResults(
        "templateguess",
        null,
        response.results,
        response.totalHits,
        {},
        queryString,
        options,
        response.error
      )
    if (response.error) {
      useEditorStore
        .getState()
        .addError(errorKey, `Error searching for templates: ${response.error}`)
    }
  })
