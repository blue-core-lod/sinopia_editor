// Copyright 2019 Stanford University see LICENSE for license

import React, { useEffect } from "react"
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
import DashboardSection from "./DashboardSection"
import _ from "lodash"
import PreviewModal from "../editor/preview/PreviewModal"
import AlertsContextProvider from "components/alerts/AlertsContextProvider"
import ContextAlert from "components/alerts/ContextAlert"
import ContextSuccess from "components/alerts/ContextSuccess"
import { clearSuccesses } from "actions/errors"
import { dashboardErrorKey } from "utilities/errorKeyFactory"
import MarcModal from "../editor/actions/MarcModal"
import ResourceTemplateChoiceModal from "../ResourceTemplateChoiceModal"
import { completeResourceLoadingWithTemplate } from "actionCreators/resources"
import { useNavigate } from "react-router-dom"

const Dashboard = (props) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const historicalTemplates = useSelector((state) =>
    selectHistoricalTemplates(state),
  )
  const historicalSearches = useSelector((state) =>
    selectHistoricalSearches(state),
  )
  const historicalResources = useSelector((state) =>
    selectHistoricalResources(state),
  )

  // Success messages here are flashes (e.g. "your import is processing"), so
  // drop them once the user leaves rather than letting them stack up.
  useEffect(
    () => () => {
      dispatch(clearSuccesses(dashboardErrorKey))
    },
    [dispatch],
  )

  const chooseResourceTemplate = (resourceTemplateId) => {
    dispatch(completeResourceLoadingWithTemplate(resourceTemplateId)).then(
      (result) => {
        if (result) navigate("/editor")
      },
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
        <h1>Sinopia dashboard</h1>
        <ContextAlert />
        <ContextSuccess />
        <PreviewModal />
        <MarcModal />
        <ResourceTemplateChoiceModal choose={chooseResourceTemplate} />
        {showWelcome && (
          <div className="dashboard-section">
            <h2>Welcome to Sinopia.</h2>
            <p>
              As you use Sinopia, your most recently used templates, resources,
              and searches will appear on this dashboard.
            </p>
          </div>
        )}
        {!_.isEmpty(historicalTemplates) && (
          <DashboardSection id="recent-templates" title="Recent templates">
            <ResourceTemplateSearchResult results={historicalTemplates} />
          </DashboardSection>
        )}
        {!_.isEmpty(historicalSearches) && (
          <DashboardSection id="recent-searches" title="Recent searches">
            <SearchList searches={historicalSearches} />
          </DashboardSection>
        )}
        {!_.isEmpty(historicalResources) && (
          <DashboardSection id="recent-resources" title="Recent resources">
            <ResourceList resources={historicalResources} />
          </DashboardSection>
        )}
      </section>
    </AlertsContextProvider>
  )
}

Dashboard.propTypes = {
  triggerHandleOffsetMenu: PropTypes.func,
}

export default Dashboard
