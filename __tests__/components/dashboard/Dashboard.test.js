import React from "react"
import { screen } from "@testing-library/react"
import Dashboard from "components/dashboard/Dashboard"
import {
  renderComponent,
  createStore,
  createHistory,
} from "../../testUtilities/testUtils"
import { createState } from "stateUtils"
import { dashboardErrorKey } from "utilities/errorKeyFactory"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

const renderDashboard = (successes = {}) => {
  const state = createState()
  state.editor.successes = successes
  const store = createStore(state)
  const { unmount } = renderComponent(<Dashboard />, store, createHistory())
  return { store, unmount }
}

describe("<Dashboard />", () => {
  it("renders success messages for the dashboard alert key", () => {
    renderDashboard({ [dashboardErrorKey]: ["Import is being processed."] })

    expect(screen.getByText("Import is being processed.")).toBeInTheDocument()
  })

  it("renders no success alert when there are no messages", () => {
    renderDashboard()

    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("clears the success messages when navigating away", () => {
    const { store, unmount } = renderDashboard({
      [dashboardErrorKey]: ["Import is being processed."],
    })

    unmount()

    expect(store.getState().editor.successes[dashboardErrorKey]).toEqual([])
  })
})
