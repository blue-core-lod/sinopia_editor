// Copyright 2019 Stanford University see LICENSE for license

import React, { useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { sinopiaSearchUri } from "utilities/authorityConfig"
import useSearch from "hooks/useSearch"
import { useKeycloak } from "../../KeycloakContext"
import { selectHeaderSearch } from "selectors/search"
import { setHeaderSearch } from "actions/search"
import useAlerts from "hooks/useAlerts"

const HeaderSearch = () => {
  const dispatch = useDispatch()
  const currentSearch = useSelector((state) => selectHeaderSearch(state))
  const { keycloak } = useKeycloak()
  const [uri, setUri] = useState(currentSearch.uri)
  const [query, setQuery] = useState(currentSearch.query || "")
  const errorKey = useAlerts()
  const {
    fetchNewSearchResults,
    fetchTemplateGuessSearchResults,
    clearTemplateGuessSearchResults,
  } = useSearch(errorKey)

  const handleQueryChange = (event) => {
    setQuery(event.target.value)
    event.preventDefault()
  }

  const handleQueryBlur = (event) => {
    dispatch(setHeaderSearch(uri, event.target.value))
  }

  const handleUriChange = (event) => {
    setUri(event.target.value)
    dispatch(setHeaderSearch(event.target.value, query))
    event.preventDefault()
  }

  const runSearch = (event) => {
    event.preventDefault()

    dispatch(setHeaderSearch(uri, query))

    if (query === "") return

    const options = {}
    // The URI may have a /{className} suffix, which we translate into a filter for the search
    const [, filter] = uri.split("/")
    if (filter) {
      options.typeFilter = `http://id.loc.gov/ontologies/bibframe/${filter}`
    }
    fetchNewSearchResults(query, options, keycloak)
    if (uri === "urn:ld4p:sinopia" && query !== "*") {
      fetchTemplateGuessSearchResults(query)
    } else {
      clearTemplateGuessSearchResults()
    }
  }

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      runSearch(event)
    }
  }

  return (
    <div className="flex-grow-1">
      <div className="input-group header-search">
        <label htmlFor="search" className="visually-hidden">
          Search
        </label>
        <select
          className="flex-grow-0 form-select"
          id="searchType"
          value={uri}
          onChange={handleUriChange}
          onBlur={handleUriChange}
          aria-label="Search type"
          data-testid="Search type"
        >
          <option value={sinopiaSearchUri}>BIBFRAME - All</option>
          <option value={`${sinopiaSearchUri}/Work`}>
            BIBFRAME work resources
          </option>
          <option value={`${sinopiaSearchUri}/Instance`}>
            BIBFRAME instance resources
          </option>
        </select>
        <input
          className="flex-grow-1 form-control"
          type="search"
          id="search"
          name="search"
          placeholder="Search..."
          // Without this the browser treats the lone unnamed text input on the
          // page as a fillable field and drops the current page URL into it.
          autoComplete="off"
          onChange={handleQueryChange}
          onBlur={handleQueryBlur}
          onKeyPress={handleKeyPress}
          value={query}
        />
        <button
          className="btn btn-primary btn-sm"
          type="button"
          aria-label="Submit search"
          data-testid="Submit search"
          onClick={runSearch}
        >
          Search
        </button>
      </div>
    </div>
  )
}

export default HeaderSearch
