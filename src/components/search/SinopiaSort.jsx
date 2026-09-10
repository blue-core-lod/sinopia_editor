// Copyright 2019 Stanford University see LICENSE for license
import React from "react"
import { useDispatch } from "react-redux"
import { fetchSinopiaSearchResults } from "actionCreators/search"
import useSearchStore from "stores/searchStore"
import { defaultSearchResultsPerPage } from "utilities/Search"
import { useKeycloak } from "../../KeycloakContext"
import useAlerts from "hooks/useAlerts"

const SinopiaSort = () => {
  const query = useSearchStore((state) => state.resource?.query)
  const errorKey = useAlerts()
  const { keycloak } = useKeycloak()

  const searchOptions = useSearchStore(
    (state) =>
      state.resource?.options || {
        startOfRange: 0,
        resultsPerPage: defaultSearchResultsPerPage("resource"),
      }
  )
  const curSortField = searchOptions.sortField
  const curSortOrder = searchOptions.sortOrder

  const dispatch = useDispatch()
  const handleSort = (sortField, sortOrder) =>
    dispatch(
      fetchSinopiaSearchResults(
        query,
        {
          ...searchOptions,
          startOfRange: 0,
          sortField,
          sortOrder,
        },
        errorKey,
        keycloak
      )
    )

  const getClasses = (sortField, sortOrder) =>
    curSortField === sortField && curSortOrder === sortOrder
      ? "dropdown-item active"
      : "dropdown-item"

  return (
    <div className="dropdown float-right">
      <button
        className="btn btn-secondary dropdown-toggle btn-filter"
        type="button"
        id="sortDropdownButton"
        data-bs-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
      >
        Sort by
      </button>
      <div
        className="dropdown-menu dropdown-menu-right"
        aria-labelledby="sortDropdownButton"
      >
        <button
          type="button"
          className={getClasses("label", "asc")}
          href="#"
          onClick={() => handleSort("label", "asc")}
        >
          Label, ascending
        </button>
        <button
          type="button"
          className={getClasses("label", "desc")}
          href="#"
          onClick={() => handleSort("label", "desc")}
        >
          Label, descending
        </button>
        <button
          type="button"
          className={getClasses("modified", "desc")}
          href="#"
          onClick={() => handleSort("modified", "desc")}
        >
          Modified date, newest first
        </button>
        <button
          type="button"
          className={getClasses("modified", "asc")}
          href="#"
          onClick={() => handleSort("modified", "asc")}
        >
          Modified date, oldest first
        </button>
        <button
          type="button"
          className={getClasses(undefined, undefined)}
          href="#"
          onClick={() => handleSort(undefined, undefined)}
        >
          Relevance
        </button>
      </div>
    </div>
  )
}

export default SinopiaSort
