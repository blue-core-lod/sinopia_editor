import useEntitiesStore from "stores/entitiesStore"

afterEach(() => {
  useEntitiesStore.setState({
    languageLookup: [],
    languages: {},
    scriptLookup: [],
    scripts: {},
    transliterations: {},
    transliterationLookup: [],
    groupMap: {},
    lookups: {},
    exports: [],
    properties: {},
    propertyTemplates: {},
    relationships: {},
    subjects: {},
    subjectTemplates: {},
    values: {},
    versions: {},
  })
})

describe("entitiesStore", () => {
  describe("initial state", () => {
    it("has correct initial shape", () => {
      const state = useEntitiesStore.getState()
      expect(state.subjects).toEqual({})
      expect(state.properties).toEqual({})
      expect(state.values).toEqual({})
      expect(state.exports).toEqual([])
      expect(state.groupMap).toEqual({})
    })
  })

  describe("groupsReceived", () => {
    it("sets groups and groupMap", () => {
      useEntitiesStore.getState().groupsReceived([
        { id: "stanford", label: "Stanford University" },
        { id: "pcc", label: "PCC" },
      ])
      const state = useEntitiesStore.getState()
      expect(state.groupMap).toEqual({
        stanford: "Stanford University",
        pcc: "PCC",
      })
    })
  })

  describe("exportsReceived", () => {
    it("sets exports", () => {
      useEntitiesStore.getState().exportsReceived(["export1.zip", "export2.zip"])
      expect(useEntitiesStore.getState().exports).toEqual([
        "export1.zip",
        "export2.zip",
      ])
    })
  })

  describe("setVersions and clearVersions", () => {
    it("sets and clears versions for a resource", () => {
      useEntitiesStore.getState().setVersions("res1", ["v1", "v2"])
      expect(useEntitiesStore.getState().versions.res1).toEqual(["v1", "v2"])
      useEntitiesStore.getState().clearVersions("res1")
      expect(useEntitiesStore.getState().versions.res1).toBeUndefined()
    })
  })

  describe("setRelationships and clearRelationships", () => {
    it("sets and clears relationships", () => {
      const rels = { bfWorkRefs: ["ref1"] }
      useEntitiesStore.getState().setRelationships("res1", rels)
      expect(useEntitiesStore.getState().relationships.res1).toEqual(rels)
      useEntitiesStore.getState().clearRelationships("res1")
      expect(useEntitiesStore.getState().relationships.res1).toBeUndefined()
    })
  })

  describe("applyReducer preserves actions", () => {
    it("store actions survive after state update", () => {
      useEntitiesStore.getState().exportsReceived(["test.zip"])
      // Verify actions still exist
      expect(typeof useEntitiesStore.getState().groupsReceived).toBe("function")
      expect(typeof useEntitiesStore.getState().addSubject).toBe("function")
    })
  })
})
