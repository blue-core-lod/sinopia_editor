import useEditorStore from "stores/editorStore"

const resetState = () => {
  useEditorStore.setState({
    copyToNewMessage: { oldUri: null, timestamp: null },
    currentResource: undefined,
    currentPreviewResource: undefined,
    currentComponent: {},
    currentModal: [],
    currentLangModalValue: undefined,
    currentDiff: { compareFrom: undefined, compareTo: undefined },
    errors: {},
    lastSave: {},
    resources: [],
    resourceValidation: {},
    unusedRDF: {},
    marc: null,
    pendingResourceTemplateSelection: null,
  })
}

afterEach(resetState)

describe("editorStore", () => {
  describe("error actions", () => {
    it("adds and clears errors", () => {
      const { addError, clearErrors } = useEditorStore.getState()
      addError("key1", "error1")
      addError("key1", "error2")
      expect(useEditorStore.getState().errors.key1).toEqual(["error1", "error2"])
      clearErrors("key1")
      expect(useEditorStore.getState().errors.key1).toEqual([])
    })
  })

  describe("modal actions", () => {
    it("pushes and pops modals", () => {
      const { showModal, hideModal } = useEditorStore.getState()
      showModal("Modal1")
      showModal("Modal2")
      expect(useEditorStore.getState().currentModal).toEqual(["Modal1", "Modal2"])
      hideModal()
      expect(useEditorStore.getState().currentModal).toEqual(["Modal1"])
    })

    it("showLangModal sets currentLangModalValue", () => {
      useEditorStore.getState().showLangModal("value123")
      const state = useEditorStore.getState()
      expect(state.currentModal).toEqual(["LangModal"])
      expect(state.currentLangModalValue).toBe("value123")
    })
  })

  describe("setCurrentEditResource", () => {
    it("adds resource to resources list if new", () => {
      useEditorStore.getState().setCurrentEditResource("res1")
      const state = useEditorStore.getState()
      expect(state.currentResource).toBe("res1")
      expect(state.resources).toEqual(["res1"])
    })
  })

  describe("clearResource", () => {
    it("removes resource and cleans up related state", () => {
      useEditorStore.setState({
        resources: ["res1", "res2"],
        currentResource: "res1",
        errors: { "resourceEdit-res1": ["err"] },
        lastSave: { res1: "2020-01-01" },
        unusedRDF: { res1: "some rdf" },
      })
      useEditorStore.getState().clearResource("res1")
      const state = useEditorStore.getState()
      expect(state.resources).toEqual(["res2"])
      expect(state.currentResource).toBe("res2")
      expect(state.lastSave.res1).toBeUndefined()
      expect(state.unusedRDF.res1).toBeUndefined()
    })
  })

  describe("setCurrentComponent", () => {
    it("does not change when modal is open", () => {
      useEditorStore.setState({ currentModal: ["SomeModal"] })
      useEditorStore.getState().setCurrentComponent("sub1", "prop1", "comp1")
      expect(useEditorStore.getState().currentComponent).toEqual({})
    })
  })

  describe("showValidationErrors", () => {
    it("sets validation and hides modal", () => {
      useEditorStore.setState({ currentModal: ["Modal1"] })
      useEditorStore.getState().showValidationErrors("res1")
      const state = useEditorStore.getState()
      expect(state.resourceValidation.res1).toBe(true)
      expect(state.currentModal).toEqual([])
    })
  })
})
