export const clearSearchResults = (searchType) => ({
  type: "CLEAR_SEARCH_RESULTS",
  payload: searchType,
})

export const setSearchResults = (
  searchType,
  uri,
  results,
  totalResults,
  facetResults,
  query,
  options,
  error,
  links
) => ({
  type: "SET_SEARCH_RESULTS",
  payload: {
    searchType,
    uri,
    results,
    totalResults,
    facetResults,
    query,
    options,
    error,
    links,
  },
})

export const setHeaderSearch = (uri, query) => ({
  type: "SET_HEADER_SEARCH",
  payload: {
    uri,
    query,
  },
})
