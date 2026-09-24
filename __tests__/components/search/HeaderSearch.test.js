import React from "react"
import { screen } from "@testing-library/react"
import HeaderSearch from "components/search/HeaderSearch"
import AlertsContextProvider from "components/alerts/AlertsContextProvider"
import {
  renderComponent,
  createStore,
  createHistory,
} from "../../testUtilities/testUtils"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

const renderHeaderSearch = () => {
  const store = createStore(createState())
  renderComponent(
    <AlertsContextProvider value="testerrorkey">
      <HeaderSearch />
    </AlertsContextProvider>,
    store,
    createHistory()
  )
}

describe("<HeaderSearch />", () => {
  it("starts empty", () => {
    renderHeaderSearch()

    expect(screen.getByLabelText("Search")).toHaveValue("")
  })

  it("opts the query input out of browser autofill", () => {
    renderHeaderSearch()

    // Otherwise the browser fills the field with the current page URL.
    expect(screen.getByLabelText("Search")).toHaveAttribute(
      "autocomplete",
      "off"
    )
  })
})
