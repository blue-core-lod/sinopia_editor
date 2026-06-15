// Copyright 2019 Stanford University see LICENSE for license
/* eslint max-params: ["error", 4] */

import React from "react"
import { useSelector, useDispatch } from "react-redux"
import {
  selectSearchResults,
  selectFilteredSearchResults,
} from "selectors/search"
import ClassFilter from "./ClassFilter"
import SearchResultRows from "./SearchResultRows"
import SinopiaSort from "./SinopiaSort"
import MarcModal from "../editor/actions/MarcModal"
import ResourceTemplateChoiceModal from "../ResourceTemplateChoiceModal"
import { completeResourceLoadingWithTemplate } from "actionCreators/resources"
import { useHistory } from "react-router-dom"
import _ from "lodash"

const SinopiaSearchResults = () => {
  const dispatch = useDispatch()
  const history = useHistory()
  const searchResults = useSelector((state) =>
    selectSearchResults(state, "resource")
  )
  const filteredResults = useSelector((state) =>
    selectFilteredSearchResults(state, "resource")
  )

  const chooseResourceTemplate = (resourceTemplateId) => {
    dispatch(completeResourceLoadingWithTemplate(resourceTemplateId)).then(
      (result) => {
        if (result) history.push("/editor")
      }
    )
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
                <th>Label / ID</th>
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
