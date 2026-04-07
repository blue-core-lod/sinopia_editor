// Copyright 2019 Stanford University see LICENSE for license
import {
  getSearchResults,
  getTemplateSearchResults,
  getLookupResult,
  getSearchResultsWithFacets,
  getTemplateSearchResultsByIds,
  getSearchResultsByUris,
} from "sinopiaSearch"
import { findAuthorityConfig } from "utilities/authorityConfig"

// Blue Core API format for resource search results
const blueCoreResourceResult = {
  total: 2,
  results: [
    {
      uri: "https://bcld.info/resource/34ef053e-f558-4299-a8a7-c8b79a598d99",
      data: {
        "@type": ["AbbreviatedTitle"],
        title: { mainTitle: "foo bar" },
      },
      created_at: "2019-11-27T19:05:48.496Z",
      updated_at: "2019-11-27T19:05:48.496Z",
    },
    {
      uri: "https://bcld.info/resource/a96f16c1-a15c-4f4f-8a25-7ed49ba1eebe",
      data: {
        "@type": ["AbbreviatedTitle"],
        title: { mainTitle: "foo" },
      },
      created_at: "2019-11-27T19:05:48.496Z",
      updated_at: "2019-11-27T19:05:48.496Z",
    },
  ],
  links: null,
}

const expectedResourceResults = [
  {
    uri: "https://bcld.info/resource/34ef053e-f558-4299-a8a7-c8b79a598d99",
    label: "foo bar",
    created: "2019-11-27T19:05:48.496Z",
    modified: "2019-11-27T19:05:48.496Z",
    type: ["http://id.loc.gov/ontologies/bibframe/AbbreviatedTitle"],
    group: "blue core",
    editGroups: ["blue core"],
  },
  {
    uri: "https://bcld.info/resource/a96f16c1-a15c-4f4f-8a25-7ed49ba1eebe",
    label: "foo",
    created: "2019-11-27T19:05:48.496Z",
    modified: "2019-11-27T19:05:48.496Z",
    type: ["http://id.loc.gov/ontologies/bibframe/AbbreviatedTitle"],
    group: "blue core",
    editGroups: ["blue core"],
  },
]

describe("getSearchResults", () => {
  const errorResult = {
    error: {
      root_cause: [
        {
          type: "parsing_exception",
          reason: "[simple_query_string] unsupported field [xdefault_operator]",
          line: 1,
          col: 90,
        },
      ],
      type: "parsing_exception",
      reason: "[simple_query_string] unsupported field [xdefault_operator]",
      line: 1,
      col: 90,
    },
  }

  it("performs a search with default sort order and returns results", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ json: () => blueCoreResourceResult })
      )

    const results = await getSearchResults("foo")
    expect(results).toEqual({
      totalHits: 2,
      results: expectedResourceResults,
      links: null,
      options: { noFacetResults: true },
    })
    expect(global.fetch).toHaveBeenCalledWith("?q=foo", { method: "GET" })
  })

  it("performs a search with specified page and sort order and returns results", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ json: () => blueCoreResourceResult })
      )
    await getSearchResults("foo", {
      startOfRange: 10,
      resultsPerPage: 15,
      sortField: "label",
      sortOrder: "desc",
    })
    expect(global.fetch).toHaveBeenCalledWith("?q=foo", { method: "GET" })
  })

  it("performs a search and handles error response", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ json: () => errorResult }))

    const results = await getSearchResults("foo")
    expect(results).toEqual({
      totalHits: 0,
      results: [],
      error: "[simple_query_string] unsupported field [xdefault_operator]",
      options: { noFacetResults: true },
    })
  })

  it("performs a search and handles raised error", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(() => Promise.reject(new Error("Frickin network")))

    const results = await getSearchResults("foo")
    expect(results).toEqual({
      totalHits: 0,
      results: [],
      error: "Error: Frickin network",
      options: { noFacetResults: true },
    })
  })
})

describe("getSearchResultsWithFacets", () => {
  it("performs a search with defaults and returns results", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ json: () => blueCoreResourceResult })
      )

    const [results] = await getSearchResultsWithFacets("foo")
    expect(results).toEqual({
      totalHits: 2,
      results: expectedResourceResults,
      links: null,
      options: {},
    })
    expect(global.fetch).toHaveBeenCalledWith("?q=foo", { method: "GET" })
  })

  it("performs a search with specified filters and returns results", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ json: () => blueCoreResourceResult })
      )

    await getSearchResultsWithFacets("foo", {
      typeFilter: ["http://id.loc.gov/ontologies/bibframe/AbbreviatedTitle"],
      groupFilter: ["cornell"],
      noFacetResults: true,
    })
    expect(global.fetch).toHaveBeenCalledWith("?q=foo", { method: "GET" })
  })
})

describe("getLookupResult", () => {
  describe("for a non-template authority with results", () => {
    const lookupConfig = findAuthorityConfig("urn:ld4p:sinopia:bibframe:work")

    const workResult = {
      total: 1,
      results: [
        {
          uri: "https://bcld.info/resource/3519e138-0f07-46a6-bd82-d4804c3b4890",
          data: {
            "@type": ["Work"],
            title: { mainTitle: "Foo" },
          },
          created_at: "2019-11-03T15:04:18.015Z",
          updated_at: "2019-11-03T15:04:18.015Z",
        },
      ],
      links: null,
    }

    it("performs a search and returns result", async () => {
      global.fetch = jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ json: () => workResult })
        )

      const result = await getLookupResult("foo", lookupConfig)
      expect(result).toEqual({
        totalHits: 1,
        results: [
          {
            uri: "https://bcld.info/resource/3519e138-0f07-46a6-bd82-d4804c3b4890",
            label: "Foo",
            created: "2019-11-03T15:04:18.015Z",
            modified: "2019-11-03T15:04:18.015Z",
            type: ["http://id.loc.gov/ontologies/bibframe/Work"],
            group: "blue core",
            editGroups: ["blue core"],
          },
        ],
        links: null,
        options: { noFacetResults: true, typeFilter: lookupConfig.type },
      })
    })
  })

  describe("for a non-template authority with no results", () => {
    const lookupConfig = findAuthorityConfig(
      "urn:ld4p:sinopia:bibframe:instance"
    )
    const instanceResult = {
      total: 0,
      results: [],
      links: null,
    }

    it("performs a search and returns result", async () => {
      global.fetch = jest
        .fn()
        .mockImplementationOnce(() =>
          Promise.resolve({ json: () => instanceResult })
        )

      const result = await getLookupResult("foo", lookupConfig)
      expect(result).toEqual({
        totalHits: 0,
        results: [],
        links: null,
        options: { noFacetResults: true, typeFilter: lookupConfig.type },
      })
    })
  })

  describe("for template authority", () => {
    const lookupConfig = findAuthorityConfig(
      "urn:ld4p:sinopia:resourceTemplate"
    )

    it("performs a search and returns result", async () => {
      global.fetch = jest
        .fn()
        .mockImplementationOnce(() =>
          Promise.resolve({ json: () => templateResult })
        )

      const result = await getLookupResult("foo", lookupConfig)
      expect(result).toEqual({
        totalHits: 1,
        results: [
          {
            author: "LD4P",
            date: "2019-08-19",
            group: "blue core",
            id: "ld4p:RT:bf2:Cartographic:Item",
            label:
              "Cartographic Item (BIBFRAME) (ld4p:RT:bf2:Cartographic:Item)",
            originalURI:
              "http://localhost:3000/resource/ld4p:RT:bf2:Cartographic:Item",
            remark: "based on LC template ld4p:RT:bf2:Cartographic:Item",
            resourceLabel: "Cartographic Item (BIBFRAME)",
            resourceURI: "http://id.loc.gov/ontologies/bibframe/Item",
            uri: "http://localhost:3000/resources/ld4p:RT:bf2:Cartographic:Item",
          },
        ],
        links: null,
      })
    })
  })
})

// Blue Core API format for template search results
const templateResult = {
  total: 1,
  results: [
    {
      id: "ld4p:RT:bf2:Cartographic:Item",
      uri: "http://localhost:3000/resource/ld4p:RT:bf2:Cartographic:Item",
      data: [
        {
          "@id": "http://localhost:3000/resource/ld4p:RT:bf2:Cartographic:Item",
          "http://sinopia.io/vocabulary/hasAuthor": [{ "@value": "LD4P" }],
          "http://sinopia.io/vocabulary/hasDate": [{ "@value": "2019-08-19" }],
          "http://www.w3.org/2000/01/rdf-schema#label": [
            { "@value": "Cartographic Item (BIBFRAME)" },
          ],
          "http://sinopia.io/vocabulary/hasResourceId": [
            { "@value": "ld4p:RT:bf2:Cartographic:Item" },
          ],
          "http://sinopia.io/vocabulary/hasClass": [
            { "@id": "http://id.loc.gov/ontologies/bibframe/Item" },
          ],
          "http://sinopia.io/vocabulary/hasRemark": [
            {
              "@value":
                "based on LC template ld4p:RT:bf2:Cartographic:Item",
            },
          ],
        },
      ],
    },
  ],
  links: null,
}

const expectedTemplateResult = {
  author: "LD4P",
  date: "2019-08-19",
  group: "blue core",
  id: "ld4p:RT:bf2:Cartographic:Item",
  originalURI: "http://localhost:3000/resource/ld4p:RT:bf2:Cartographic:Item",
  remark: "based on LC template ld4p:RT:bf2:Cartographic:Item",
  resourceLabel: "Cartographic Item (BIBFRAME)",
  resourceURI: "http://id.loc.gov/ontologies/bibframe/Item",
  uri: "http://localhost:3000/resources/ld4p:RT:bf2:Cartographic:Item",
}

describe("getTemplateSearchResults", () => {
  it("returns results", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ json: () => templateResult }))
    const results = await getTemplateSearchResults("Cartographic:Item")

    expect(results).toEqual({
      totalHits: 1,
      results: [expectedTemplateResult],
      links: null,
    })

    expect(global.fetch).toHaveBeenCalledWith(
      "/profile?q=Cartographic%3AItem&limit=10&offset=0",
      {
        headers: { "Content-Type": "application/json" },
        method: "GET",
      }
    )
  })

  it("returns error if server returns error status", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ status: 504, statusText: "Gateway Timeout" })
      )
    const results = await getTemplateSearchResults("Palo Alto")
    expect(results).toEqual({
      totalHits: 0,
      results: [],
      error: "504: Gateway Timeout",
    })
  })
})

describe("getTemplateSearchResultsByIds", () => {
  it("returns results", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ json: () => templateResult }))
    const results = await getTemplateSearchResultsByIds([
      "ld4p:RT:bf2:Cartographic:Item",
    ])

    expect(results).toEqual({
      totalHits: 1,
      results: [expectedTemplateResult],
      error: undefined,
    })

    expect(global.fetch).toHaveBeenCalledWith(
      "/profile?q=ld4p%3ART%3Abf2%3ACartographic%3AItem&limit=50",
      {
        headers: { "Content-Type": "application/json" },
        method: "GET",
      }
    )
  })
})

describe("getSearchResultsByUris", () => {
  const singleResourceResult = {
    total: 1,
    results: [
      {
        uri: "http://localhost:3000/resource/3d831f47-e686-4b8f-9086-11383b2af762",
        data: {
          "@type": ["TableOfContents"],
          title: {
            mainTitle:
              "http://localhost:3000/resource/3d831f47-e686-4b8f-9086-11383b2af762",
          },
        },
        created_at: undefined,
        updated_at: "2020-10-05T14:31:16.563Z",
      },
    ],
    links: null,
  }

  it("performs a search and returns results", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ json: () => singleResourceResult })
      )

    const results = await getSearchResultsByUris([
      "http://localhost:3000/resource/3d831f47-e686-4b8f-9086-11383b2af762",
    ])
    expect(results).toEqual({
      totalHits: 1,
      results: [
        {
          uri: "http://localhost:3000/resource/3d831f47-e686-4b8f-9086-11383b2af762",
          label:
            "http://localhost:3000/resource/3d831f47-e686-4b8f-9086-11383b2af762",
          created: undefined,
          modified: "2020-10-05T14:31:16.563Z",
          type: ["http://id.loc.gov/ontologies/bibframe/TableOfContents"],
          group: "blue core",
          editGroups: ["blue core"],
        },
      ],
      links: null,
      options: undefined,
    })
    expect(global.fetch).toHaveBeenCalledWith("", { method: "GET" })
  })
})
