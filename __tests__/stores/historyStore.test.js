import useHistoryStore from "stores/historyStore"
import Config from "Config"

afterEach(() => {
  useHistoryStore.setState({ templates: [], searches: [], resources: [] })
})

describe("historyStore", () => {
  describe("initial state", () => {
    it("has empty arrays", () => {
      const state = useHistoryStore.getState()
      expect(state.templates).toEqual([])
      expect(state.searches).toEqual([])
      expect(state.resources).toEqual([])
    })
  })

  describe("addTemplateHistory", () => {
    it("transforms template to result and adds it", () => {
      const template = {
        key: "ld4p:RT:bf2:Identifiers:LCCN",
        uri: "http://localhost:3000/resource/ld4p:RT:bf2:Identifiers:LCCN",
        class: "http://id.loc.gov/ontologies/bibframe/Lccn",
        label: "LCCN",
        author: "LD4P",
        remark: "Library of Congress Card Number",
        date: "2019-08-19",
        group: "stanford",
        editGroups: ["cornell"],
      }
      useHistoryStore.getState().addTemplateHistory(template)
      expect(useHistoryStore.getState().templates).toEqual([
        {
          id: "ld4p:RT:bf2:Identifiers:LCCN",
          resourceLabel: "LCCN",
          resourceURI: "http://id.loc.gov/ontologies/bibframe/Lccn",
          uri: "http://localhost:3000/resource/ld4p:RT:bf2:Identifiers:LCCN",
          author: "LD4P",
          remark: "Library of Congress Card Number",
          date: "2019-08-19",
          group: "stanford",
          editGroups: ["cornell"],
        },
      ])
    })

    it("adds items uniquely by id", () => {
      const { addTemplateHistory } = useHistoryStore.getState()
      addTemplateHistory({ key: "template1" })
      addTemplateHistory({ key: "template2" })
      addTemplateHistory({ key: "template1" })

      expect(useHistoryStore.getState().templates.map((t) => t.id)).toEqual([
        "template1",
        "template2",
      ])
    })

    it("limits to 10 items", () => {
      useHistoryStore.setState({
        templates: Array.from({ length: 10 }, (_, i) => ({
          id: `template${i + 1}`,
        })),
      })
      useHistoryStore.getState().addTemplateHistory({ key: "template11" })

      const ids = useHistoryStore.getState().templates.map((t) => t.id)
      expect(ids).toHaveLength(10)
      expect(ids[0]).toBe("template11")
      expect(ids[9]).toBe("template9")
    })

    it("does not add root resource template", () => {
      useHistoryStore
        .getState()
        .addTemplateHistory({ key: Config.rootResourceTemplateId })
      expect(useHistoryStore.getState().templates).toEqual([])
    })
  })

  describe("addTemplateHistoryByResult", () => {
    it("adds result directly", () => {
      const result = { id: "template1", resourceLabel: "Test" }
      useHistoryStore.getState().addTemplateHistoryByResult(result)
      expect(useHistoryStore.getState().templates).toEqual([result])
    })
  })

  describe("addSearchHistory", () => {
    it("adds items uniquely by deep equality", () => {
      const search1 = { authority: "sinopia", query: "commodore" }
      const search2 = { authority: "sinopia", query: "atari" }
      const { addSearchHistory } = useHistoryStore.getState()

      addSearchHistory(search1)
      addSearchHistory(search2)
      addSearchHistory(search1)

      expect(useHistoryStore.getState().searches).toEqual([search1, search2])
    })
  })

  describe("addResourceHistoryByResult", () => {
    it("adds result directly", () => {
      const result = {
        uri: "http://localhost:3000/resource/abc",
        type: ["http://id.loc.gov/ontologies/bibframe/Work"],
      }
      useHistoryStore.getState().addResourceHistoryByResult(result)
      expect(useHistoryStore.getState().resources).toEqual([result])
    })
  })

  describe("addResourceHistory", () => {
    it("transforms payload to result and adds it", () => {
      const payload = {
        resourceUri: "http://localhost:3000/resource/abc",
        type: "http://id.loc.gov/ontologies/bibframe/Work",
        group: "stanford",
        editGroups: ["cornell"],
        modified: "2020-10-05T14:38:19.704Z",
      }
      useHistoryStore.getState().addResourceHistory(payload)

      expect(useHistoryStore.getState().resources).toEqual([
        {
          uri: "http://localhost:3000/resource/abc",
          label: "http://localhost:3000/resource/abc",
          type: ["http://id.loc.gov/ontologies/bibframe/Work"],
          modified: "2020-10-05T14:38:19.704Z",
          group: "stanford",
          editGroups: ["cornell"],
        },
      ])
    })

    it("deduplicates by uri", () => {
      const { addResourceHistory } = useHistoryStore.getState()
      addResourceHistory({ resourceUri: "uri1" })
      addResourceHistory({ resourceUri: "uri2" })
      addResourceHistory({ resourceUri: "uri1" })

      const uris = useHistoryStore.getState().resources.map((r) => r.uri)
      expect(uris).toEqual(["uri1", "uri2"])
    })
  })
})
