import { defaultSearchResultsPerPage } from "utilities/Search"

export const selectSearchError = (state, searchType) =>
  state.search[searchType]?.error

export const selectSearchUri = (state, searchType) =>
  state.search[searchType]?.uri

export const selectSearchQuery = (state, searchType) =>
  state.search[searchType]?.query

export const selectSearchTotalResults = (state, searchType) =>
  state.search[searchType]?.totalResults || 0

export const selectSearchFacetResults = (state, searchType, facetType) =>
  state.search[searchType]?.facetResults[facetType]

export const selectSearchOptions = (state, searchType) =>
  state.search[searchType]?.options || {
    startOfRange: 0,
    resultsPerPage: defaultSearchResultsPerPage(searchType),
  }

export const selectSearchResults = (state, searchType) =>
  state.search[searchType]?.results

export const selectFilteredSearchResults = (state, searchType) => {
  const results = state.search[searchType]?.results
  const typeFilter = state.search[searchType]?.options?.typeFilter
  if (!results || typeFilter == null) return results
  if (!typeFilter.length) return []
  const activeFilters = Array.isArray(typeFilter) ? typeFilter : [typeFilter]
  return results.filter((result) =>
    result.type?.some((t) => activeFilters.includes(t))
  )
}

export const selectSearchLinks = (state, searchType) =>
  state.search[searchType]?.links

export const selectHeaderSearch = (state) => state.editor.currentHeaderSearch
