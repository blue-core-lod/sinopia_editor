// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import { useSelector, useDispatch } from "react-redux"
import {
  selectHistoricalTemplates,
  selectHistoricalSearches,
  selectHistoricalResources,
} from "selectors/history"
import Header from "../Header"
import ResourceList from "./ResourceList"
import ResourceTemplateSearchResult from "../templates/ResourceTemplateSearchResult"
import SearchList from "./SearchList"
import _ from "lodash"
import PreviewModal from "../editor/preview/PreviewModal"
import AlertsContextProvider from "components/alerts/AlertsContextProvider"
import ContextAlert from "components/alerts/ContextAlert"
import { dashboardErrorKey } from "utilities/errorKeyFactory"
import MarcModal from "../editor/actions/MarcModal"
import ResourceTemplateChoiceModal from "../ResourceTemplateChoiceModal"
import { completeResourceLoadingWithTemplate } from "actionCreators/resources"
import { useHistory } from "react-router-dom"

const Dashboard = (props) => {
  const dispatch = useDispatch()
  const history = useHistory()
  const historicalTemplates = useSelector((state) =>
    selectHistoricalTemplates(state)
  )
  const historicalSearches = useSelector((state) =>
    selectHistoricalSearches(state)
  )
  const historicalResources = useSelector((state) =>
    selectHistoricalResources(state)
  )

  const chooseResourceTemplate = (resourceTemplateId) => {
    dispatch(completeResourceLoadingWithTemplate(resourceTemplateId)).then(
      (result) => {
        if (result) history.push("/editor")
      }
    )
  }

  const showWelcome =
    _.isEmpty(historicalTemplates) &&
    _.isEmpty(historicalSearches) &&
    _.isEmpty(historicalResources)

  return (
    <AlertsContextProvider value={dashboardErrorKey}>
      <section id="dashboard">
        <Header triggerEditorMenu={props.triggerHandleOffsetMenu} />
        <ContextAlert />
        <PreviewModal />
        <MarcModal />
        <ResourceTemplateChoiceModal choose={chooseResourceTemplate} />
        {showWelcome && (
          <div>
            <h2>Welcome to Sinopia.</h2>
            <p>
              As you use Sinopia, your most recently used templates, resources,
              and searches will appear on this dashboard.
            </p>
          </div>
        )}
        {!_.isEmpty(historicalTemplates) && (
          <div>
            <h2>Recent templates</h2>
            <ResourceTemplateSearchResult results={historicalTemplates} />
          </div>
        )}
        {!_.isEmpty(historicalSearches) && (
          <div>
            <h2>Recent searches</h2>
            <SearchList searches={historicalSearches} />
          </div>
        )}
        {!_.isEmpty(historicalResources) && (
          <div>
            <h2>Recent resources</h2>
            <ResourceList resources={historicalResources} />
          </div>
        )}
      </section>
    </AlertsContextProvider>
  )
}

Dashboard.propTypes = {
  triggerHandleOffsetMenu: PropTypes.func,
}

export default Dashboard
