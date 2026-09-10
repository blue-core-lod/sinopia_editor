import { create } from "zustand"
import { sinopiaSearchUri } from "utilities/authorityConfig"
import { resourceEditErrorKey } from "utilities/errorKeyFactory"
import _ from "lodash"

const useEditorStore = create((set, get) => ({
  // State
  copyToNewMessage: {
    oldUri: null,
    timestamp: null,
  },
  currentResource: undefined,
  currentPreviewResource: undefined,
  currentComponent: {},
  currentModal: [],
  currentLangModalValue: undefined,
  currentDiff: {
    compareFrom: undefined,
    compareTo: undefined,
  },
  errors: {},
  lastSave: {},
  resources: [],
  resourceValidation: {},
  unusedRDF: {},
  marc: null,
  currentHeaderSearch: {
    query: null,
    uri: sinopiaSearchUri,
  },
  pendingResourceTemplateSelection: null,

  // Error actions
  addError: (errorKey, error) => {
    const state = get()
    set({
      errors: {
        ...state.errors,
        [errorKey]: [...(state.errors[errorKey] || []), error],
      },
    })
  },

  clearErrors: (errorKey) => {
    const state = get()
    set({
      errors: {
        ...state.errors,
        [errorKey]: [],
      },
    })
  },

  addSuccess: (successKey, message) => {
    const state = get()
    set({
      successes: {
        ...state.successes,
        [successKey]: [...(state.successes?.[successKey] || []), message],
      },
    })
  },

  clearSuccesses: (successKey) => {
    const state = get()
    set({
      successes: {
        ...state.successes,
        [successKey]: [],
      },
    })
  },

  hideValidationErrors: (resourceKey) => {
    const state = get()
    set({
      resourceValidation: {
        ...state.resourceValidation,
        [resourceKey]: false,
      },
    })
  },

  showValidationErrors: (resourceKey) => {
    // Also hides modal (same as Redux reducer)
    const state = get()
    const newCurrentModal = _.dropRight(state.currentModal)
    set({
      currentModal: newCurrentModal,
      currentLangModalValue: null,
      marc: null,
      resourceValidation: {
        ...state.resourceValidation,
        [resourceKey]: true,
      },
    })
  },

  // Modal actions
  showModal: (name) => {
    const state = get()
    set({
      currentModal: [...state.currentModal, name],
      currentLangModalValue: null,
      marc: null,
    })
  },

  hideModal: () => {
    const state = get()
    set({
      currentModal: _.dropRight(state.currentModal),
      currentLangModalValue: null,
      marc: null,
    })
  },

  showLangModal: (valueKey) => {
    const state = get()
    set({
      currentModal: [...state.currentModal, "LangModal"],
      currentLangModalValue: valueKey,
      marc: null,
    })
  },

  showMarcModal: (marc) => {
    const state = get()
    set({
      currentModal: [...state.currentModal, "MarcModal"],
      currentLangModalValue: null,
      marc,
    })
  },

  // Resource actions
  setCurrentEditResource: (resourceKey) => {
    const state = get()
    const newState = { currentResource: resourceKey }
    if (resourceKey && !state.resources.includes(resourceKey)) {
      newState.resources = [...state.resources, resourceKey]
    }
    set(newState)
  },

  setCurrentPreviewResource: (resourceKey) => {
    const state = get()
    const newState = { currentPreviewResource: resourceKey }
    if (resourceKey && !state.resources.includes(resourceKey)) {
      newState.resources = [...state.resources, resourceKey]
    }
    set(newState)
  },

  setCurrentDiffResources: (compareFromResourceKey, compareToResourceKey) => {
    const state = get()
    set({
      currentDiff: {
        compareFrom:
          compareFromResourceKey === undefined
            ? state.currentDiff.compareFrom
            : compareFromResourceKey,
        compareTo:
          compareToResourceKey === undefined
            ? state.currentDiff.compareTo
            : compareToResourceKey,
      },
    })
  },

  setUnusedRDF: (resourceKey, rdf) => {
    const state = get()
    set({
      unusedRDF: {
        ...state.unusedRDF,
        [resourceKey]: rdf,
      },
    })
  },

  clearResource: (resourceKey) => {
    const state = get()
    const resourceIndex = state.resources.indexOf(resourceKey)
    const newResources = [
      ...state.resources.slice(0, resourceIndex),
      ...state.resources.slice(resourceIndex + 1),
    ]
    const newErrors = { ...state.errors }
    delete newErrors[resourceEditErrorKey(resourceKey)]
    const newLastSave = { ...state.lastSave }
    delete newLastSave[resourceKey]
    const newUnusedRDF = { ...state.unusedRDF }
    delete newUnusedRDF[resourceKey]

    set({
      resources: newResources,
      currentResource:
        state.currentResource === resourceKey
          ? _.first(newResources) || null
          : state.currentResource,
      errors: newErrors,
      lastSave: newLastSave,
      unusedRDF: newUnusedRDF,
    })
  },

  saveResourceFinished: (resourceKey, timestamp) => {
    const state = get()
    set({
      lastSave: {
        ...state.lastSave,
        [resourceKey]: timestamp,
      },
    })
  },

  // Component/navigation actions
  setCurrentComponent: (rootSubjectKey, rootPropertyKey, key) => {
    const state = get()
    if (!_.isEmpty(state.currentModal)) return

    const currentComponent = state.currentComponent[rootSubjectKey]
    if (
      currentComponent?.component === key &&
      currentComponent?.property === rootPropertyKey
    )
      return

    set({
      currentComponent: {
        ...state.currentComponent,
        [rootSubjectKey]: {
          component: key,
          property: rootPropertyKey,
        },
      },
    })
  },

  setPendingResourceTemplateSelection: (payload) => {
    set({ pendingResourceTemplateSelection: payload })
  },

  clearPendingResourceTemplateSelection: () => {
    set({ pendingResourceTemplateSelection: null })
  },

  // Message actions
  showCopyNewMessage: (oldUri) => {
    set({
      copyToNewMessage: {
        timestamp: Date.now(),
        oldUri,
      },
    })
  },

  // Header search
  setHeaderSearch: (uri, query) => {
    set({
      currentHeaderSearch: { uri, query },
    })
  },
}))

export default useEditorStore
