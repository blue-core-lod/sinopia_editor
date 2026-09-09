import {
  loadTemplateHistory,
  loadSearchHistory,
  loadResourceHistory,
  addResourceHistory,
} from "actionCreators/history"
import Config from "Config"
import configureMockStore from "redux-mock-store"
import thunk from "redux-thunk"
import { createState } from "stateUtils"
import * as sinopiaSearch from "sinopiaSearch"
import useHistoryStore from "stores/historyStore"

jest.spyOn(Config, "useResourceTemplateFixtures", "get").mockReturnValue(true)

jest.useFakeTimers({ now: new Date("2020-08-20T11:34:40.887Z") })

afterAll(() => {
  jest.useRealTimers()
})

afterEach(() => {
  useHistoryStore.setState({ templates: [], searches: [], resources: [] })
})

const mockStore = configureMockStore([thunk])

describe("loadTemplateHistory()", () => {
  sinopiaSearch.getTemplateSearchResultsByIds = jest
    .fn()
    .mockResolvedValue({ results: [{ id: "template1" }, { id: "template2" }] })
  it("fetches from search and adds to Zustand store", async () => {
    const store = mockStore(createState())

    await store.dispatch(loadTemplateHistory(["template1", "template2"]))

    expect(useHistoryStore.getState().templates).toEqual([
      { id: "template1" },
      { id: "template2" },
    ])

    expect(sinopiaSearch.getTemplateSearchResultsByIds).toHaveBeenCalledWith([
      "template1",
      "template2",
    ])
  })
})

describe("loadSearchHistory()", () => {
  it("adds label and stores in Zustand", async () => {
    const store = mockStore(createState())

    await store.dispatch(
      loadSearchHistory([
        {
          authorityUri: "urn:ld4p:qa:oclc_fast:topic",
          query: "leland",
        },
      ])
    )

    expect(useHistoryStore.getState().searches).toEqual([
      {
        authorityLabel: "OCLCFAST Topic (QA) - direct",
        authorityUri: "urn:ld4p:qa:oclc_fast:topic",
        query: "leland",
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
  it("fetches from search and adds to Zustand store", async () => {
    const store = mockStore(createState())
    await store.dispatch(loadResourceHistory([uri1, uri2]))

    expect(useHistoryStore.getState().resources).toEqual([
      { uri: uri1 },
      { uri: uri2 },
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
    it("adds result by result to Zustand store", async () => {
      sinopiaSearch.getSearchResultsByUris = jest
        .fn()
        .mockResolvedValue({ results: [{ uri }] })

      const store = mockStore(createState())
      await store.dispatch(
        addResourceHistory(
          uri,
          "http://id.loc.gov/ontologies/bibframe/Work",
          "stanford"
        )
      )

      expect(useHistoryStore.getState().resources).toEqual([{ uri }])

      expect(sinopiaSearch.getSearchResultsByUris).toHaveBeenCalledWith([uri])
    })
  })

  describe("result not found", () => {
    it("transforms and adds to Zustand store", async () => {
      sinopiaSearch.getSearchResultsByUris = jest
        .fn()
        .mockResolvedValue({ results: [] })

      const store = mockStore(createState())
      await store.dispatch(
        addResourceHistory(
          uri,
          "http://id.loc.gov/ontologies/bibframe/Work",
          "stanford"
        )
      )

      expect(useHistoryStore.getState().resources).toEqual([
        {
          uri,
          label: uri,
          type: ["http://id.loc.gov/ontologies/bibframe/Work"],
          modified: "2020-08-20T11:34:40.887Z",
          group: "stanford",
          editGroups: undefined,
        },
      ])
    })
  })
})
