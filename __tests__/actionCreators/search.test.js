// Copyright 2019 Stanford University see LICENSE for license
import {
  fetchSinopiaSearchResults,
  fetchQASearchResults,
  fetchTemplateGuessSearchResults,
} from "actionCreators/search"
import * as server from "sinopiaSearch"
import { createState } from "stateUtils"
import * as sinopiaApi from "sinopiaApi"
import * as QuestioningAuthority from "utilities/QuestioningAuthority"
import rdf from "rdf-ext"
import useHistoryStore from "stores/historyStore"
import useSearchStore from "stores/searchStore"
import useEditorStore from "stores/editorStore"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

afterEach(() => {
  useHistoryStore.setState({ templates: [], searches: [], resources: [] })
  useSearchStore.setState({ resource: null, template: null })
  useEditorStore.setState({ errors: {}, successes: {} })
})

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
    createState()
    await fetchSinopiaSearchResults(
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

    expect(useEditorStore.getState().errors.testerrorkey).toEqual([])
    expect(useSearchStore.getState().resource).toMatchObject({
      error: undefined,
      uri: "urn:ld4p:sinopia",
      query: "*",
      results: mockSearchResults.results,
      totalResults: mockSearchResults.totalHits,
      facetResults: mockFacetResults,
      options: expect.objectContaining({
        sortField: "label",
        sortOrder: "desc",
        startOfRange: 5,
        resultsPerPage: 10,
      }),
    })
    expect(useHistoryStore.getState().searches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          authorityUri: "urn:ld4p:sinopia",
          authorityLabel: "Sinopia resources",
          query: "*",
        }),
      ])
    )
    expect(sinopiaApi.putUserHistory).toHaveBeenCalledWith(
      "Foo McBar",
      "search",
      "e983591a38cf0e7a8d9a2a1e3251a1b6",
      '{"authorityUri":"urn:ld4p:sinopia","query":"*"}',
      keycloak
    )
  })
})

describe("fetchQASearchResults", () => {
  const query = "*"
  const uri = "urn:ld4p:qa:oclc_fast:topic"

  describe("when happy path", () => {
    const mockSearchResults = [
      {
        uri: "http://share-vde.org/sharevde/rdfBibframe/Work/3107365",
        id: "http://share-vde.org/sharevde/rdfBibframe/Work/3107365",
        label: "These twain",
        context: [
          {
            property: "Title",
            values: [" These twain"],
            selectable: true,
            drillable: false,
          },
          {
            property: "Type",
            values: [
              "http://id.loc.gov/ontologies/bflc/Hub",
              "http://id.loc.gov/ontologies/bibframe/Work",
            ],
            selectable: false,
            drillable: false,
          },
          {
            property: "Contributor",
            values: ["Bennett, Arnold,1867-1931."],
            selectable: false,
            drillable: false,
          },
        ],
      },
      {
        uri: "http://share-vde.org/sharevde/rdfBibframe/Work/3107365-1",
        id: "http://share-vde.org/sharevde/rdfBibframe/Work/3107365-1",
        label: "These twain",
        context: [
          {
            property: "Title",
            values: [" These twain"],
            selectable: true,
            drillable: false,
          },
          {
            property: "Type",
            values: [
              "http://id.loc.gov/ontologies/bibframe/Text",
              "http://id.loc.gov/ontologies/bibframe/Work",
            ],
            selectable: false,
            drillable: false,
          },
          {
            property: "Contributor",
            values: ["Bennett, Arnold,1867-1931."],
            selectable: false,
            drillable: false,
          },
        ],
      },
    ]
    const mockResponse = {
      results: mockSearchResults,
      response_header: { total_records: 15 },
    }

    beforeEach(() => {
      jest
        .spyOn(QuestioningAuthority, "createLookupPromise")
        .mockResolvedValue(mockResponse)
    })

    it("dispatches action", async () => {
      createState()
      await fetchQASearchResults(query, uri, "testerrorkey")

      expect(useEditorStore.getState().errors.testerrorkey).toEqual([])
      expect(useSearchStore.getState().resource).toMatchObject({
        uri,
        query,
        results: mockSearchResults,
        totalResults: 15,
        options: expect.objectContaining({}),
        error: undefined,
        facetResults: {},
      })
      expect(useHistoryStore.getState().searches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            authorityUri: uri,
            authorityLabel: "OCLCFAST Topic (QA) - direct",
            query,
          }),
        ])
      )
    })
  })

  describe("when error occurs", () => {
    beforeEach(() => {
      jest
        .spyOn(QuestioningAuthority, "createLookupPromise")
        .mockResolvedValue({
          isError: true,
          errorObject: new Error("Ooops..."),
        })
    })

    it("dispatches action when error", async () => {
      createState()
      await fetchQASearchResults(query, uri, "testerrorkey")

      expect(useSearchStore.getState().resource).toMatchObject({
        uri,
        query,
        results: [],
        totalResults: 0,
        options: expect.objectContaining({}),
        facetResults: {},
        error: "Ooops...",
      })
      expect(useEditorStore.getState().errors.testerrorkey).toContain(
        "An error occurred while searching: Ooops..."
      )
    })
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
      createState()
      await fetchTemplateGuessSearchResults(query, "testerrorkey", {
        startOfRange: 0,
      })

      expect(useSearchStore.getState().templateguess).toMatchObject({
        error: undefined,
        uri: null,
        query,
        results: mockSearchResults.results,
        totalResults: mockSearchResults.totalHits,
        facetResults: {},
        options: expect.objectContaining({
          startOfRange: 0,
        }),
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
      createState()
      await fetchTemplateGuessSearchResults(query, "testerrorkey", {
        startOfRange: 0,
      })

      expect(useSearchStore.getState().templateguess).toMatchObject({
        error: "Ooops",
        uri: null,
        query,
        results: [],
        totalResults: 0,
        facetResults: {},
        options: expect.objectContaining({
          startOfRange: 0,
        }),
      })
      expect(useEditorStore.getState().errors.testerrorkey).toContain(
        "Error searching for templates: Ooops"
      )
    })
  })
})
