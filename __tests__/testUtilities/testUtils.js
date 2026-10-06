// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { Provider } from "react-redux"
import { render } from "@testing-library/react"
import { createStore as createReduxStore, applyMiddleware } from "redux"
import { thunk } from "redux-thunk"
import appReducer from "reducers/index"
/*
 * react-router v6's <Router> no longer accepts a `history` prop. HistoryRouter
 * keeps the v5 shape so tests can continue to construct a memory history, pass
 * it in, and assert on history.location.* (33 test files do this).
 *
 * `useTransitions={false}` is required as of react-router v7, which wraps the
 * location state update in React.startTransition. That defers the re-render
 * past the act() scope of the fireEvent that triggered it, so a navigate()
 * would not have taken effect by the time the next assertion runs. Opting out
 * restores v6's synchronous setState. Only the test harness needs this; the
 * real app's <BrowserRouter> keeps transitions on.
 */
import { unstable_HistoryRouter as Router } from "react-router-dom"
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
  setupModal()
  return {
    ...render(
      <Router history={history || createHistory()} useTransitions={false}>
        <Provider store={store || createStore()}>
          <AlertsContextProvider value={errorKey || "testErrorKey"}>
            {component}
          </AlertsContextProvider>
        </Provider>
      </Router>
    ),
  }
}

export const createStore = (initialState) => {
  return createReduxStore(
    appReducer,
    initialState || createState(),
    applyMiddleware(thunk)
  )
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
