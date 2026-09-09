import { create } from "zustand"
import { defaultSearchResultsPerPage } from "utilities/Search"

const useSearchStore = create((set, get) => ({
  resource: null,
  template: null,

  setSearchResults: (
    searchType,
    uri,
    results,
    totalResults,
    facetResults,
    query,
    options,
    error,
    links
  ) => {
    set({
      [searchType]: {
        uri,
        results,
        totalResults,
        facetResults: facetResults || {},
        relationshipResults: {},
        query,
        options: {
          resultsPerPage:
            options?.resultsPerPage ||
            defaultSearchResultsPerPage(searchType),
          startOfRange: options?.startOfRange || 0,
          sortField: options?.sortField,
          sortOrder: options?.sortOrder,
          typeFilter: options?.typeFilter,
          groupFilter: options?.groupFilter,
        },
        links,
        error,
      },
    })
  },

  clearSearchResults: (searchType) => {
    set({ [searchType]: null })
  },

  setSearchRelationships: (uri, relationships) => {
    const resource = get().resource
    if (!resource) return

    set({
      resource: {
        ...resource,
        relationshipResults: {
          ...resource.relationshipResults,
          [uri]: relationships,
        },
      },
    })
  },
}))

export default useSearchStore
