// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { useSelector } from "react-redux"
import PropTypes from "prop-types"
import Header from "../Header"
import SinopiaSearchResults from "./SinopiaSearchResults"
import SearchResultsPaging from "./SearchResultsPaging"
import SearchResultsMessage from "./SearchResultsMessage"
import {
  selectSearchQuery,
  selectSearchOptions,
  selectSearchTotalResults,
} from "selectors/search"
import useSearch from "hooks/useSearch"
import AlertsContextProvider from "components/alerts/AlertsContextProvider"
import ContextAlert from "components/alerts/ContextAlert"
import { searchErrorKey } from "utilities/errorKeyFactory"
import TemplateGuessSearchResults from "./TemplateGuessSearchResults"
import PreviewModal from "../editor/preview/PreviewModal"
import { useKeycloak } from "../../KeycloakContext"

const Search = (props) => {
  const { fetchSearchResults } = useSearch()

  const { keycloak } = useKeycloak()

  const searchOptions = useSelector((state) =>
    selectSearchOptions(state, "resource"),
  )
  const queryString = useSelector((state) =>
    selectSearchQuery(state, "resource"),
  )
  const totalResults = useSelector((state) =>
    selectSearchTotalResults(state, "resource"),
  )

  // Page by offset against the original query. Following the API's next/prev
  // links stored the link URL as the query, so the next numbered page reused
  // that link's offset (and the API sends no "last" link at all).
  const changeSearchPage = (startOfRange) => {
    fetchSearchResults(queryString, searchOptions, startOfRange, keycloak)
  }

  const paging = (label) => (
    <SearchResultsPaging
      variant="text"
      label={label}
      resultsPerPage={searchOptions.resultsPerPage}
      startOfRange={searchOptions.startOfRange}
      totalResults={totalResults}
      changePage={changeSearchPage}
    />
  )

  return (
    <AlertsContextProvider value={searchErrorKey}>
      <div id="search">
        <Header triggerEditorMenu={props.triggerHandleOffsetMenu} />
        <ContextAlert />
        <PreviewModal />
        <h1 className="search-results-heading">Search results</h1>
        <TemplateGuessSearchResults />
        {paging("search results pages, top")}
        <SinopiaSearchResults />
        {paging("search results pages, bottom")}
        <SearchResultsMessage />
      </div>
    </AlertsContextProvider>
  )
}

Search.propTypes = {
  triggerHandleOffsetMenu: PropTypes.func,
}

export default Search
