// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { render } from "@testing-library/react"
import { Router } from "react-router-dom"
import { createMemoryHistory } from "history"
import _ from "lodash"
import App from "components/App"
import { createState } from "./stateUtils"
import AlertsContextProvider from "components/alerts/AlertsContextProvider"

export const renderApp = (store, history) => {
  return renderComponent(<App />, store, history)
}

export const renderComponent = (
  component,
  store,
  history,
  { errorKey = null } = {}
) => {
  // Seed Zustand stores with default state if not already done
  if (!store) createState()
  setupModal()
  return {
    ...render(
      <Router history={history || createHistory()}>
        <AlertsContextProvider value={errorKey || "testErrorKey"}>
          {component}
        </AlertsContextProvider>
      </Router>
    ),
  }
}

export const createStore = (initialState) => {
  // Legacy compatibility — just create the Zustand state
  if (initialState) {
    // If passed initial state, seed Zustand stores
    return initialState
  }
  return createState()
}

export const createHistory = (initialEntries) => {
  const history = createMemoryHistory()
  if (!_.isEmpty(initialEntries)) {
    initialEntries.forEach((initialEntry) => {
      history.push(initialEntry)
    })
  }
  return history
}

export const setupModal = () => {
  const portalRoot = document.createElement("div")
  portalRoot.setAttribute("id", "modal")
  document.body.appendChild(portalRoot)
}
