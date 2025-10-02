// Copyright 2019 Stanford University see LICENSE for license
import Config from "Config"
/* eslint-disable node/no-unpublished-import */
import {
  getFixtureTemplateSearchResults,
  hasFixtureResource,
  resourceSearchResults,
} from "../__tests__/testUtilities/fixtureLoaderHelper"
import _ from "lodash"

/* eslint-enable node/no-unpublished-import */

// Not using ES client because not intended for use in browser.
/**
 * Performs a search of Sinopia resources.
 * @param {string} query
 * @param {Object} options for the search (resultsPerPage, startOfRange, sortField, sortOrder, typeFilter)
 * @return {Promise<Object>} promise containing the result of the search.
 */
export const getSearchResults = async (query, options = {}) =>
  getSearchResultsWithFacets(query, { ...options, noFacetResults: true }).then(
    ([results]) => results
  )

/**
 * Performs a search of Sinopia resources.
 * @param {string} query
 * @param {Object} options for the search (resultsPerPage, queryFrom, sortField, sortOrder, typeFilter, noFacetResults)
 * @return {Promise<Object>} promise containing the result of the search.
 */
export const getSearchResultsWithFacets = async (
  query,
  options = {},
  keycloak
) => {
  if (Config.useResourceTemplateFixtures && hasFixtureResource(query))
    return Promise.resolve(resourceSearchResults(query))

  const body = new URLSearchParams({ q: query })
  // const termsFilters = []
  // if (options.typeFilter) {
  //   termsFilters.push({
  //     terms: {
  //       type: Array.isArray(options.typeFilter)
  //         ? options.typeFilter
  //         : [options.typeFilter],
  //     },
  //   })
  // }
  // if (options.groupFilter) {
  //   termsFilters.push({
  //     terms: {
  //       group: Array.isArray(options.groupFilter)
  //         ? options.groupFilter
  //         : [options.groupFilter],
  //     },
  //   })
  // }
  // if (!_.isEmpty(termsFilters)) body.query.bool.filter = termsFilters

  // if (!options.noFacetResults) {
  //   body.aggs = {
  //     types: {
  //       terms: {
  //         field: "type",
  //       },
  //     },
  //     groups: {
  //       terms: {
  //         field: "group",
  //         size: 20,
  //       },
  //     },
  //   }
  // }
  return fetchSearchResults(body, keycloak)
}

export const getSearchResultsByUris = (resourceUris) => {
  if (
    Config.useResourceTemplateFixtures &&
    resourceUris.length === 1 &&
    hasFixtureResource(resourceUris[0])
  )
    return Promise.resolve(resourceSearchResults(resourceUris[0])[0])

  const body = {
    query: {
      terms: {
        uri: resourceUris,
      },
    },
    size: resourceUris.length,
  }
  return fetchSearchResults(body).then((results) => results[0])
}

const fetchSearchResults = (body, keycloak) => {
  const url = `${Config.searchHost}${Config.searchPath}?${body}`
  return fetch(url, {
    method: "GET",
  })
    .then((resp) => {
      return resp.json()
    })
    .then((json) => {
      if (json.error) {
        return [
          {
            totalHits: 0,
            results: [],
            error: json.error.reason || json.error,
          },
          undefined,
        ]
      }
      return [hitsToResult(json), aggregationsToResult(json)]
    })
    .catch((err) => [
      {
        totalHits: 0,
        results: [],
        error: err.toString(),
      },
      undefined,
    ])
}

const hitsToResult = (payload) => {
  const results = []
  payload.results.forEach((hit) => {
    const types = hit.data["@type"]
    let rdfTypes = []
    if (Array.isArray(types)) {
      types.forEach((type) =>
        rdfTypes.push(`http://id.loc.gov/ontologies/bibframe/${type}`)
      )
    } else {
      rdfTypes.push(`http://id.loc.gov/ontologies/bibframe/${types}`)
    }
    results.push({
      uri: hit.uri,
      label: hit.data.title.mainTitle,
      created: hit.created_at,
      modified: hit.updated_at,
      type: rdfTypes,
      group: "blue core",
      editGroups: ["blue core"],
    })
  })
  return {
    totalHits: results.length,
    results: results,
  }
}

const aggregationsToResult = (aggs) => {
  if (!aggs) return undefined
  const result = {}
  Object.keys(aggs).forEach((field) => {
    result[field] = aggs[field].buckets
  })
  return result
}

export const getTemplateSearchResults = (query, options = {}) => {
  const params = getTemplateSearchParams(query, options)
  return fetchTemplateSearchResults(params, templateHitsToResult).then(
    (searchResults) => {
      if (Config.useResourceTemplateFixtures) {
        const newResults = searchResults.results.filter(
          (hit) =>
            [hit.id, hit.resourceURI].includes(query) || query.length === 0
        )
        return {
          totalHits: newResults.length,
          results: newResults,
          error: undefined,
        }
      }
      return searchResults
    }
  )
}

const getTemplateSearchParams = (query, options) => {
  const params = new URLSearchParams()
  if (query) {
    params.append("q", query)
  }
  const limit = options?.resultsPerPage || Config.templateSearchResultsPerPage
  const offset = options?.startOfRange || 0
  params.append("limit", limit)
  params.append("offset", offset)
  return params
}

export const getTemplateSearchResultsByIds = (templateIds) => {
  const params = new URLSearchParams()
  // Blue Core API doesn't support 'id' parameter, use 'q' for query instead
  // This returns multiple results, so we need to filter by id after
  templateIds.forEach((id) => params.append("q", id))
  params.append("limit", 50) // Increase limit to ensure we get all results
  return fetchTemplateSearchResults(params, templateHitsToResult).then(
    (searchResults) => {
      // Filter results to only include templates with matching IDs
      const newResults = searchResults.results.filter((hit) =>
        templateIds.includes(hit.id)
      )
      return {
        totalHits: newResults.length,
        results: newResults,
        error: searchResults.error,
      }
    }
  )
}

const fetchTemplateSearchResults = async (params, hitsToResultFunc) => {
  if (Config.useResourceTemplateFixtures) {
    const results = await getFixtureTemplateSearchResults()
    return {
      totalHits: results.length,
      results,
      error: undefined,
    }
  }

  const url = `${Config.searchHost}${Config.templateSearchPath}?${params}`
  return fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })
    .then((resp) => {
      if (resp.status >= 300) {
        return {
          totalHits: 0,
          results: [],
          error: `${resp.status}: ${resp.statusText}`,
        }
      }
      return resp.json()
    })
    .then((json) => {
      if (json.error) {
        return {
          totalHits: 0,
          results: [],
          error: json.error.reason || json.error,
        }
      }
      return hitsToResultFunc(json)
    })
    .catch((err) => ({
      totalHits: 0,
      results: [],
      error: err.toString(),
    }))
}

const templateModFromBlueCore = (hit) => {
  // Formats Blue Core Template Result for editor's expectations
  let resourceAuthor = "Unknown"
  let resourceId = "Unknown"
  let resourceDate = "Unknown"
  let resourceLabel = "Unknown"
  let resourceRemark = ""
  let resourceURI = "Unknown"
  hit.data.map((row) => {
    if (row["@id"] === hit.uri) {
      resourceAuthor =
        row["http://sinopia.io/vocabulary/hasAuthor"][0]["@value"]
      resourceDate = row["http://sinopia.io/vocabulary/hasDate"][0]["@value"]
      resourceLabel =
        row["http://www.w3.org/2000/01/rdf-schema#label"][0]["@value"]
      resourceId =
        row["http://sinopia.io/vocabulary/hasResourceId"][0]["@value"]
      resourceURI = row["http://sinopia.io/vocabulary/hasClass"][0]["@id"]
      resourceRemark = row["http://sinopia.io/vocabulary/hasRemark"]
        ? row["http://sinopia.io/vocabulary/hasRemark"][0]["@value"]
        : ""
    }
  })
  const bcURI = `${Config.sinopiaApiBase}/resources/${hit.id}`
  return {
    author: resourceAuthor,
    date: resourceDate,
    group: "blue core", // hardcoded for now
    id: resourceId,
    originalURI: hit.uri,
    remark: resourceRemark,
    resourceLabel: resourceLabel,
    resourceURI: resourceURI,
    uri: bcURI,
  }
}

const templateHitsToResult = (payload) => ({
  totalHits: payload.total || payload.results?.length || 0,
  results: (payload.results || []).map((row) => templateModFromBlueCore(row)),
  links: payload.links,
})

const templateLookupToResult = (payload) => ({
  totalHits: payload.total || payload.results?.length || 0,
  results: (payload.results || []).map((row) => {
    const template = templateModFromBlueCore(row)
    return {
      ...template,
      label: `${template.resourceLabel} (${template.id})`,
    }
  }),
  links: payload.links,
})

const getTemplateLookupResults = (query, options = {}) => {
  const params = getTemplateSearchParams(query, options)
  return fetchTemplateSearchResults(params, templateLookupToResult)
}

export const getLookupResult = (query, lookupConfig, options) => {
  // Templates get special handling since use id rather than URI.
  let getSearchResultsPromise
  if (lookupConfig.uri === "urn:ld4p:sinopia:resourceTemplate") {
    getSearchResultsPromise = getTemplateLookupResults(query, options)
  } else {
    getSearchResultsPromise = getSearchResults(query, {
      ...options,
      typeFilter: lookupConfig.type,
    })
  }
  return getSearchResultsPromise
}
