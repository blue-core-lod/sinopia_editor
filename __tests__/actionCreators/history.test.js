import {
  loadTemplateHistory,
  loadSearchHistory,
  loadResourceHistory,
  addResourceHistory,
  addTemplateHistoryForResource,
  templateIdForResource,
} from "actionCreators/history"
import Config from "Config"
import configureMockStore from "redux-mock-store"
import { thunk } from "redux-thunk"
import { createState } from "stateUtils"
import * as sinopiaSearch from "sinopiaSearch"

// This forces Sinopia server to use fixtures
jest.spyOn(Config, "useResourceTemplateFixtures", "get").mockReturnValue(true)

jest.useFakeTimers({ now: new Date("2020-08-20T11:34:40.887Z") })

afterAll(() => {
  jest.useRealTimers()
})

const mockStore = configureMockStore([thunk])

describe("loadTemplateHistory()", () => {
  sinopiaSearch.getTemplateSearchResultsByIds = jest
    .fn()
    .mockResolvedValue({ results: [{ id: "template1" }, { id: "template2" }] })
  it("fetches from search and dispatches", async () => {
    const store = mockStore(createState())

    await store.dispatch(loadTemplateHistory(["template1", "template2"]))

    expect(store.getActions()).toEqual([
      {
        type: "ADD_TEMPLATE_HISTORY_BY_RESULT",
        payload: { id: "template2" },
      },
      {
        type: "ADD_TEMPLATE_HISTORY_BY_RESULT",
        payload: { id: "template1" },
      },
    ])

    expect(sinopiaSearch.getTemplateSearchResultsByIds).toHaveBeenCalledWith([
      "template1",
      "template2",
    ])
  })
})

describe("loadSearchHistory()", () => {
  it("adds label and dispatches", async () => {
    const store = mockStore(createState())

    await store.dispatch(
      loadSearchHistory([
        {
          authorityUri: "urn:ld4p:sinopia",
          query: "leland",
        },
      ]),
    )

    expect(store.getActions()).toEqual([
      {
        type: "ADD_SEARCH_HISTORY",
        payload: {
          authorityLabel: "Sinopia resources",
          authorityUri: "urn:ld4p:sinopia",
          query: "leland",
        },
      },
    ])
  })

  it("skips searches saved against external authorities", async () => {
    const store = mockStore(createState())

    await store.dispatch(
      loadSearchHistory([
        {
          authorityUri: "urn:ld4p:qa:oclc_fast:topic",
          query: "leland",
        },
        {
          authorityUri: "urn:ld4p:sinopia",
          query: "twain",
        },
      ]),
    )

    expect(store.getActions()).toEqual([
      {
        type: "ADD_SEARCH_HISTORY",
        payload: {
          authorityLabel: "Sinopia resources",
          authorityUri: "urn:ld4p:sinopia",
          query: "twain",
        },
      },
    ])
  })
})

describe("loadResourceHistory()", () => {
  const uri1 =
    "http://localhost:3000/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3f"
  const uri2 =
    "http://localhost:3000/resource/65753d03-8202-463e-8cef-3e5f6f3897a4"

  sinopiaSearch.getSearchResultsByUris = jest
    .fn()
    .mockResolvedValue({ results: [{ uri: uri1 }, { uri: uri2 }] })
  it("fetches from search and dispatches", async () => {
    const store = mockStore(createState())
    await store.dispatch(loadResourceHistory([uri1, uri2]))

    expect(store.getActions()).toEqual([
      {
        type: "ADD_RESOURCE_HISTORY_BY_RESULT",
        payload: {
          uri: uri2,
        },
      },
      {
        type: "ADD_RESOURCE_HISTORY_BY_RESULT",
        payload: {
          uri: uri1,
        },
      },
    ])

    expect(sinopiaSearch.getSearchResultsByUris).toHaveBeenCalledWith([
      uri1,
      uri2,
    ])
  })
})

describe("addResourceHistory()", () => {
  const uri =
    "http://localhost:3000/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3f"

  describe("result found", () => {
    it("dispatches", async () => {
      sinopiaSearch.getSearchResultsByUris = jest
        .fn()
        .mockResolvedValue({ results: [{ uri }] })

      const store = mockStore(createState())
      await store.dispatch(
        addResourceHistory(
          uri,
          "http://id.loc.gov/ontologies/bibframe/Work",
          "stanford",
        ),
      )

      expect(store.getActions()).toEqual([
        {
          type: "ADD_RESOURCE_HISTORY_BY_RESULT",
          payload: {
            uri,
          },
        },
      ])

      expect(sinopiaSearch.getSearchResultsByUris).toHaveBeenCalledWith([uri])
    })
  })

  describe("result not found", () => {
    it("dispatches", async () => {
      sinopiaSearch.getSearchResultsByUris = jest
        .fn()
        .mockResolvedValue({ results: [] })

      const store = mockStore(createState())
      await store.dispatch(
        addResourceHistory(
          uri,
          "http://id.loc.gov/ontologies/bibframe/Work",
          "stanford",
        ),
      )

      expect(store.getActions()).toEqual([
        {
          type: "ADD_RESOURCE_HISTORY",
          payload: {
            resourceUri: uri,
            group: "stanford",
            type: "http://id.loc.gov/ontologies/bibframe/Work",
            modified: "2020-08-20T11:34:40.887Z",
          },
        },
      ])
    })
  })
})

describe("templateIdForResource()", () => {
  const property = (defaultUri, value) => ({
    propertyTemplate: { defaultUri },
    values: value ? [value] : [],
  })

  it("returns the template's resource id", () => {
    const resource = {
      properties: [
        property("http://sinopia.io/vocabulary/hasResourceId", {
          literal: "ld4p:RT:bf2:Title:AbbrTitle",
        }),
      ],
    }

    expect(templateIdForResource(resource)).toEqual(
      "ld4p:RT:bf2:Title:AbbrTitle",
    )
  })

  it("returns undefined when the id has no value", () => {
    const resource = {
      properties: [property("http://sinopia.io/vocabulary/hasResourceId")],
    }

    expect(templateIdForResource(resource)).toBeUndefined()
  })
})

describe("addTemplateHistoryForResource()", () => {
  const templateId = "ld4p:RT:bf2:Title:AbbrTitle"
  const uri = "http://localhost:3000/profiles/abc-123"
  const literalProperty = (defaultUri, literal) => ({
    propertyTemplate: { defaultUri },
    values: [{ literal }],
  })
  const resource = {
    uri,
    group: "stanford",
    editGroups: ["cornell"],
    properties: [
      literalProperty("http://sinopia.io/vocabulary/hasResourceId", templateId),
      literalProperty(
        "http://www.w3.org/2000/01/rdf-schema#label",
        "Abbreviated Title",
      ),
      {
        propertyTemplate: {
          defaultUri: "http://sinopia.io/vocabulary/hasClass",
        },
        values: [
          { uri: "http://id.loc.gov/ontologies/bibframe/AbbreviatedTitle" },
        ],
      },
      literalProperty("http://sinopia.io/vocabulary/hasAuthor", "LD4P"),
      literalProperty("http://sinopia.io/vocabulary/hasRemark", "A remark"),
      literalProperty("http://sinopia.io/vocabulary/hasDate", "2026-11-17"),
    ],
  }
  const resultFromResource = {
    id: templateId,
    resourceLabel: "Abbreviated Title",
    resourceURI: "http://id.loc.gov/ontologies/bibframe/AbbreviatedTitle",
    uri,
    author: "LD4P",
    remark: "A remark",
    date: "2026-11-17",
    group: "stanford",
    editGroups: ["cornell"],
  }

  describe("result found", () => {
    it("dispatches the search result", async () => {
      sinopiaSearch.getTemplateSearchResultsByIds = jest
        .fn()
        .mockResolvedValue({
          results: [{ id: templateId, resourceLabel: "From search" }],
        })

      const store = mockStore(createState())
      await store.dispatch(addTemplateHistoryForResource(resource, templateId))

      expect(store.getActions()).toEqual([
        {
          type: "ADD_TEMPLATE_HISTORY_BY_RESULT",
          payload: { id: templateId, resourceLabel: "From search" },
        },
      ])
      expect(sinopiaSearch.getTemplateSearchResultsByIds).toHaveBeenCalledWith([
        templateId,
      ])
    })
  })

  describe("result not found", () => {
    it("dispatches a result built from the template resource", async () => {
      sinopiaSearch.getTemplateSearchResultsByIds = jest
        .fn()
        .mockResolvedValue({ results: [] })

      const store = mockStore(createState())
      await store.dispatch(addTemplateHistoryForResource(resource, templateId))

      expect(store.getActions()).toEqual([
        {
          type: "ADD_TEMPLATE_HISTORY_BY_RESULT",
          payload: resultFromResource,
        },
      ])
    })
  })

  describe("search error", () => {
    it("logs the error and dispatches a result built from the template resource", async () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {})
      sinopiaSearch.getTemplateSearchResultsByIds = jest
        .fn()
        .mockResolvedValue({ results: [], error: "500: Server Error" })

      const store = mockStore(createState())
      await store.dispatch(addTemplateHistoryForResource(resource, templateId))

      expect(consoleError).toHaveBeenCalledWith("500: Server Error")
      expect(store.getActions()).toEqual([
        {
          type: "ADD_TEMPLATE_HISTORY_BY_RESULT",
          payload: resultFromResource,
        },
      ])
      consoleError.mockRestore()
    })
  })
})
