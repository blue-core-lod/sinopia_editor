// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import Header from "../Header"
import SinopiaSearchResults from "./SinopiaSearchResults"
import QASearchResults from "./QASearchResults"
import SearchResultsPaging from "./SearchResultsPaging"
import SearchResultsMessage from "./SearchResultsMessage"
import useSearchStore from "stores/searchStore"
import { defaultSearchResultsPerPage } from "utilities/Search"
import { sinopiaSearchUri } from "utilities/authorityConfig"
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

  const searchOptions = useSearchStore(
    (state) =>
      state.resource?.options || {
        startOfRange: 0,
        resultsPerPage: defaultSearchResultsPerPage("resource"),
      }
  )
  const uri = useSearchStore((state) => state.resource?.uri)
  const queryString = useSearchStore((state) => state.resource?.query)
  const totalResults = useSearchStore(
    (state) => state.resource?.totalResults || 0
  )
  const links = useSearchStore((state) => state.resource?.links)

  const changeSearchPage = (linkOrOffset) => {
    if (typeof linkOrOffset === "number") {
      fetchSearchResults(
        queryString,
        uri,
        searchOptions,
        linkOrOffset,
        keycloak
      )
    } else {
      fetchSearchResults(linkOrOffset, uri, searchOptions, null, keycloak)
    }
  }

  return (
    <AlertsContextProvider value={searchErrorKey}>
      <div id="search">
        <Header triggerEditorMenu={props.triggerHandleOffsetMenu} />
        <ContextAlert />
        <PreviewModal />
        <TemplateGuessSearchResults />
        {uri === sinopiaSearchUri ? (
          <SinopiaSearchResults />
        ) : (
          <QASearchResults />
        )}
        <SearchResultsPaging
          resultsPerPage={searchOptions.resultsPerPage}
          startOfRange={searchOptions.startOfRange}
          totalResults={totalResults}
          links={links}
          changePage={changeSearchPage}
        />
        <SearchResultsMessage />
      </div>
    </AlertsContextProvider>
  )
}

Search.propTypes = {
  triggerHandleOffsetMenu: PropTypes.func,
}

export default Search
