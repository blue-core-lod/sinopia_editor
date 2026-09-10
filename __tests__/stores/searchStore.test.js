import useSearchStore from "stores/searchStore"

afterEach(() => {
  useSearchStore.setState({ resource: null, template: null })
})

describe("searchStore", () => {
  describe("initial state", () => {
    it("has null resource and template", () => {
      const state = useSearchStore.getState()
      expect(state.resource).toBeNull()
      expect(state.template).toBeNull()
    })
  })

  describe("setSearchResults", () => {
    it("sets search results for a given search type", () => {
      useSearchStore
        .getState()
        .setSearchResults(
          "resource",
          "urn:ld4p:sinopia",
          [{ uri: "http://example.com/1" }],
          1,
          { types: [{ key: "Work", doc_count: 1 }] },
          "test query",
          { startOfRange: 0, resultsPerPage: 10 },
          undefined,
          undefined
        )

      const state = useSearchStore.getState()
      expect(state.resource).toEqual({
        uri: "urn:ld4p:sinopia",
        results: [{ uri: "http://example.com/1" }],
        totalResults: 1,
        facetResults: { types: [{ key: "Work", doc_count: 1 }] },
        relationshipResults: {},
        query: "test query",
        options: {
          resultsPerPage: 10,
          startOfRange: 0,
          sortField: undefined,
          sortOrder: undefined,
          typeFilter: undefined,
          groupFilter: undefined,
        },
        links: undefined,
        error: undefined,
      })
    })

    it("uses default resultsPerPage when not provided", () => {
      useSearchStore
        .getState()
        .setSearchResults(
          "template",
          null,
          [],
          0,
          {},
          "query",
          undefined,
          undefined,
          undefined
        )

      const state = useSearchStore.getState()
      expect(state.template.options.resultsPerPage).toBeDefined()
      expect(state.template.options.startOfRange).toBe(0)
    })
  })

  describe("clearSearchResults", () => {
    it("clears search results for a given search type", () => {
      useSearchStore.setState({
        resource: { results: [], query: "test" },
      })
      useSearchStore.getState().clearSearchResults("resource")
      expect(useSearchStore.getState().resource).toBeNull()
    })

    it("does not affect other search types", () => {
      useSearchStore.setState({
        resource: { results: [], query: "test" },
        template: { results: [], query: "other" },
      })
      useSearchStore.getState().clearSearchResults("resource")
      expect(useSearchStore.getState().resource).toBeNull()
      expect(useSearchStore.getState().template).toEqual({
        results: [],
        query: "other",
      })
    })
  })

  describe("setSearchRelationships", () => {
    it("sets relationship results on resource search", () => {
      useSearchStore.setState({
        resource: {
          results: [],
          relationshipResults: {},
        },
      })
      useSearchStore.getState().setSearchRelationships("http://example.com/1", {
        bfWorkRefs: [],
        bfInstanceRefs: [],
      })

      expect(useSearchStore.getState().resource.relationshipResults).toEqual({
        "http://example.com/1": { bfWorkRefs: [], bfInstanceRefs: [] },
      })
    })

    it("does nothing when resource is null", () => {
      useSearchStore
        .getState()
        .setSearchRelationships("http://example.com/1", {})
      expect(useSearchStore.getState().resource).toBeNull()
    })
  })
})
