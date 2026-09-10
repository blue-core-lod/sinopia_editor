// Copyright 2019 Stanford University see LICENSE for license
/* eslint max-params: ["error", 4] */

import React from "react"
import useSearchStore from "stores/searchStore"
import ClassFilter from "./ClassFilter"
import SearchResultRows from "./SearchResultRows"
import SinopiaSort from "./SinopiaSort"
import MarcModal from "../editor/actions/MarcModal"
import ResourceTemplateChoiceModal from "../ResourceTemplateChoiceModal"
import { completeResourceLoadingWithTemplate } from "actionCreators/resources"
import { useHistory } from "react-router-dom"
import _ from "lodash"

const SinopiaSearchResults = () => {
  const history = useHistory()
  const searchResults = useSearchStore((state) => state.resource?.results)
  const filteredResults = useSearchStore((state) => {
    const results = state.resource?.results
    const typeFilter = state.resource?.options?.typeFilter
    if (!results || typeFilter == null) return results
    if (!typeFilter.length) return []
    const activeFilters = Array.isArray(typeFilter) ? typeFilter : [typeFilter]
    return results.filter((result) =>
      result.type?.some((t) => activeFilters.includes(t))
    )
  })

  const chooseResourceTemplate = (resourceTemplateId) => {
    completeResourceLoadingWithTemplate(resourceTemplateId).then((result) => {
      if (result) history.push("/editor")
    })
  }

  if (_.isEmpty(searchResults)) {
    return null
  }

  return (
    <React.Fragment>
      <MarcModal />
      <ResourceTemplateChoiceModal choose={chooseResourceTemplate} />
      <div
        id="search-results"
        className="row"
        data-testid="sinopia-search-results"
      >
        <div className="col">
          <table
            className="table table-bordered search-results-list"
            id="search-results-list"
            data-testid="sinopia-search-results-list"
          >
            <thead>
              <tr>
                <th>Label</th>
                <th style={{ width: "30%" }}>
                  Class <ClassFilter />
                </th>
                <th style={{ width: "10%" }}>Modified</th>
                <th style={{ width: "10%" }}>
                  <SinopiaSort />
                </th>
              </tr>
            </thead>
            <tbody>
              <SearchResultRows searchResults={filteredResults} />
            </tbody>
          </table>
        </div>
      </div>
    </React.Fragment>
  )
}

export default SinopiaSearchResults
