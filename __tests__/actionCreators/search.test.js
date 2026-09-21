// Copyright 2019 Stanford University see LICENSE for license
import {
  fetchSinopiaSearchResults,
  fetchTemplateGuessSearchResults,
} from "actionCreators/search"
import * as server from "sinopiaSearch"
import configureMockStore from "redux-mock-store"
import thunk from "redux-thunk"
import { createState } from "stateUtils"
import * as sinopiaApi from "sinopiaApi"
import rdf from "rdf-ext"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

const mockStore = configureMockStore([thunk])

describe("fetchSinopiaSearchResults", () => {
  const query = "*"
  const mockSearchResults = {
    totalHits: 1,
    results: [
      {
        uri: "http://sinopia.io/resource/123",
        label: "A lonely title",
        type: ["http://id.loc.gov/ontologies/bibframe/Item"],
      },
    ],
  }

  const mockFacetResults = {
    types: [
      {
        key: "http://id.loc.gov/ontologies/bibframe/AbbreviatedTitle",
        doc_count: 1,
      },
    ],
  }

  jest.spyOn(sinopiaApi, "fetchResource").mockResolvedValue([rdf.dataset(), {}])

  it("dispatches actions", async () => {
    server.getSearchResultsWithFacets = jest
      .fn()
      .mockResolvedValue([mockSearchResults, mockFacetResults])
    sinopiaApi.putUserHistory = jest.fn().mockResolvedValue()
    const keycloak = { token: "test-token" }
    const store = mockStore(createState())
    await store.dispatch(
      fetchSinopiaSearchResults(
        query,
        {
          startOfRange: 5,
          resultsPerPage: 10,
          sortField: "label",
          sortOrder: "desc",
        },
        "testerrorkey",
        keycloak
      )
    )

    const actions = store.getActions()

    expect(actions).toHaveLength(4)
    expect(actions).toHaveAction("CLEAR_ERRORS")
    expect(actions).toHaveAction("SET_SEARCH_RESULTS", {
      searchType: "resource",
      error: undefined,
      uri: "urn:ld4p:sinopia",
      query: "*",
      results: mockSearchResults.results,
      totalResults: mockSearchResults.totalHits,
      facetResults: mockFacetResults,
      options: {
        sortField: "label",
        sortOrder: "desc",
        startOfRange: 5,
        resultsPerPage: 10,
      },
      links: undefined,
    })
    expect(actions).toHaveAction("ADD_SEARCH_HISTORY", {
      authorityUri: "urn:ld4p:sinopia",
      authorityLabel: "Sinopia resources",
      query: "*",
      keycloak,
    })
    expect(sinopiaApi.putUserHistory).toHaveBeenCalledWith(
      "Foo McBar",
      "search",
      "e983591a38cf0e7a8d9a2a1e3251a1b6",
      '{"authorityUri":"urn:ld4p:sinopia","query":"*"}',
      keycloak
    )
  })
})

describe("fetchTemplateGuessSearchResults", () => {
  describe("when success", () => {
    const query = "date"
    const mockSearchResults = {
      totalHits: 1,
      results: [
        {
          id: "testing:defaultDate",
          uri: "http://localhost:3000/resource/testing:defaultDate",
          resourceLabel: "Default date",
          resourceURI: "http://testing/defaultDate",
          group: "other",
          editGroups: [],
          groupLabel: "Other",
        },
      ],
    }

    it("dispatches actions", async () => {
      server.getTemplateSearchResults = jest
        .fn()
        .mockResolvedValue(mockSearchResults)
      const store = mockStore(createState())
      await store.dispatch(
        fetchTemplateGuessSearchResults(query, "testerrorkey", {
          startOfRange: 0,
        })
      )

      const actions = store.getActions()

      expect(actions).toHaveLength(1)
      expect(actions).toHaveAction("SET_SEARCH_RESULTS", {
        searchType: "templateguess",
        error: undefined,
        uri: null,
        query,
        results: mockSearchResults.results,
        totalResults: mockSearchResults.totalHits,
        facetResults: {},
        options: {
          startOfRange: 0,
        },
        links: undefined,
      })
    })
  })
  describe("when failure", () => {
    const query = "date"

    const mockSearchResults = {
      totalHits: 0,
      results: [],
      error: "Ooops",
    }

    it("dispatches actions", async () => {
      server.getTemplateSearchResults = jest
        .fn()
        .mockResolvedValue(mockSearchResults)
      const store = mockStore(createState())
      await store.dispatch(
        fetchTemplateGuessSearchResults(query, "testerrorkey", {
          startOfRange: 0,
        })
      )

      const actions = store.getActions()

      expect(actions).toHaveLength(2)
      expect(actions).toHaveAction("SET_SEARCH_RESULTS", {
        searchType: "templateguess",
        error: "Ooops",
        uri: null,
        query,
        results: [],
        totalResults: 0,
        facetResults: {},
        options: {
          startOfRange: 0,
        },
        links: undefined,
      })
      expect(actions).toHaveAction("ADD_ERROR", {
        errorKey: "testerrorkey",
        error: "Error searching for templates: Ooops",
      })
    })
  })
})
