// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import useSearchStore from "stores/searchStore"
import { defaultSearchResultsPerPage } from "utilities/Search"

// Renders the search results message after a search
const SearchResultsMessage = () => {
  const query = useSearchStore((state) => state.resource?.query)
  const totalResults = useSearchStore(
    (state) => state.resource?.totalResults || 0
  )
  const options = useSearchStore(
    (state) =>
      state.resource?.options || {
        startOfRange: 0,
        resultsPerPage: defaultSearchResultsPerPage("resource"),
      }
  )

  if (query === undefined) {
    return null
  }

  const startOfRange = options.startOfRange
  const resultsPerPage = options.resultsPerPage

  const lastItemOnPage =
    startOfRange + resultsPerPage > totalResults
      ? totalResults
      : startOfRange + resultsPerPage

  if (totalResults === 0) {
    return (
      <div id="search-results-message" className="row">
        <div className="col">
          <div>
            <strong>Displaying 0 Search Results</strong>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div id="search-results-message" className="row">
      <div className="col">
        <div>
          <strong>
            Displaying {startOfRange + 1} - {lastItemOnPage} of {totalResults}
          </strong>
        </div>
      </div>
    </div>
  )
}

export default SearchResultsMessage
