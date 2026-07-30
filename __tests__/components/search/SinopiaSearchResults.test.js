// Copyright 2019 Stanford University see LICENSE for license
import React from "react"
import SinopiaSearchResults from "components/search/SinopiaSearchResults"
import { fireEvent, screen } from "@testing-library/react"
import { createStore, renderComponent } from "testUtils"
import { createState } from "stateUtils"
import * as sinopiaApi from "sinopiaApi"
import * as sinopiaSearch from "sinopiaSearch"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest
    .fn()
    .mockReturnValue({ keycloak: { token: "test-token" } }),
}))

const searchResult = {
  uri: "https://api.sinopia.io/resource/some/path",
  type: ["http://schema.org/Thing"],
  group: "stanford",
  label: "An item title",
  modified: "2019-10-23T22:42:57.623Z",
  created: "2019-10-23T22:42:57.623Z",
}

const buildState = () => {
  const state = createState()
  state.search.resource = {
    query: "item",
    options: { startOfRange: 0, resultsPerPage: 10 },
    results: [searchResult],
    facetResults: {
      types: [{ key: "http://schema.org/Thing", doc_count: 1 }],
      groups: [{ key: "stanford", doc_count: 1 }],
    },
  }
  return state
}

describe("<SinopiaSearchResults />", () => {
  describe("when there are no search results", () => {
    renderComponent(<SinopiaSearchResults />)

    it("does not contain the main div", () => {
      expect(
        screen.queryByTestId("sinopia-search-results")
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText("Class", { selector: "th" })
      ).not.toBeInTheDocument()
    })
  })

  describe("when there are search results", () => {
    it("it contains the main div", () => {
      const store = createStore(buildState())
      renderComponent(<SinopiaSearchResults />, store)

      screen.getByTestId("sinopia-search-results")
      screen.getByTestId("sinopia-search-results-list")

      // Search table headers
      screen.queryByText("Label")
      screen.queryByText("Class")
      screen.getByText("Modified", { selector: "th" })

      // It has a sort button
      screen.getByText("Sort by")

      // It has filters
      screen.getByText("Class", { selector: "th" })
      screen.getByText("Filter by")

      // First row of search results
      screen.queryByText(/An item title/)
      expect(
        screen.queryByText(/https:\/\/api.sinopia.io\/resource\/some\/path/)
      ).not.toBeInTheDocument()
      screen.queryByText("Oct 23, 2019")
      screen.queryByText("http://schema.org/Thing")
    })

    it("shows a delete button for editable resources", () => {
      const store = createStore(buildState())
      renderComponent(<SinopiaSearchResults />, store)

      screen.getByTestId("Delete An item title")
    })

    it("deletes the resource and refreshes search when delete is clicked", async () => {
      jest.spyOn(sinopiaApi, "deleteResource").mockResolvedValue()
      jest
        .spyOn(sinopiaSearch, "getSearchResultsWithFacets")
        .mockResolvedValue([{ results: [], totalResults: 0 }, {}])
      jest.spyOn(sinopiaApi, "putUserHistory").mockResolvedValue()

      const store = createStore(buildState())
      renderComponent(<SinopiaSearchResults />, store)

      fireEvent.click(screen.getByTestId("Delete An item title"))

      await screen.findByTestId("sinopia-search-results-list")

      expect(sinopiaApi.deleteResource).toHaveBeenCalledWith(
        searchResult.uri,
        { token: "test-token" }
      )
      expect(sinopiaSearch.getSearchResultsWithFacets).toHaveBeenCalled()
    })
  })
})
