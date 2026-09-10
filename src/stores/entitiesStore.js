import { create } from "zustand"

// Import existing reducer functions as pure helpers
import {
  setBaseURL as setBaseURLReducer,
  showProperty as showPropertyReducer,
  hideProperty as hidePropertyReducer,
  showNavProperty as showNavPropertyReducer,
  hideNavProperty as hideNavPropertyReducer,
  showNavSubject as showNavSubjectReducer,
  hideNavSubject as hideNavSubjectReducer,
  loadResourceFinished as loadResourceFinishedReducer,
  saveResourceFinished as saveResourceFinishedReducer,
  addSubject as addSubjectReducer,
  addProperty as addPropertyReducer,
  addValue as addValueReducer,
  updateValue as updateValueReducer,
  removeValue as removeValueReducer,
  removeSubject as removeSubjectReducer,
  clearResource as clearResourceReducer,
  setResourceGroup as setResourceGroupReducer,
  setValueOrder as setValueOrderReducer,
  setVersions as setVersionsReducer,
  clearVersions as clearVersionsReducer,
  setValuePropertyURI as setValuePropertyURIReducer,
  setPropertyPropertyURI as setPropertyPropertyURIReducer,
  setClasses as setClassesReducer,
  setSubjectComponentList as setSubjectComponentListReducer,
  setResourceChanged as setResourceChangedReducer,
} from "reducers/resources"
import {
  setLanguage as setLanguageReducer,
  languagesReceived as languagesReceivedReducer,
  setDefaultLang as setDefaultLangReducer,
} from "reducers/languages"
import { groupsReceived as groupsReceivedReducer } from "reducers/groups"
import { addTemplates as addTemplatesReducer } from "reducers/templates"
import { exportsReceived as exportsReceivedReducer } from "reducers/exports"
import { lookupOptionsRetrieved as lookupOptionsRetrievedReducer } from "reducers/lookups"
import {
  setRelationships as setRelationshipsReducer,
  clearRelationships as clearRelationshipsReducer,
} from "reducers/relationships"

// Helper: run a Redux-style reducer and set the result
const applyReducer = (get, set, reducer, payload) => {
  const newState = reducer(get(), { payload })
  set(newState)
}

const useEntitiesStore = create((set, get) => ({
  // State
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

  // Resource actions
  setBaseURL: (resourceKey, resourceURI) =>
    applyReducer(get, set, setBaseURLReducer, { resourceKey, resourceURI }),
  showProperty: (propertyKey) =>
    applyReducer(get, set, showPropertyReducer, propertyKey),
  hideProperty: (propertyKey) =>
    applyReducer(get, set, hidePropertyReducer, propertyKey),
  showNavProperty: (propertyKey) =>
    applyReducer(get, set, showNavPropertyReducer, propertyKey),
  hideNavProperty: (propertyKey) =>
    applyReducer(get, set, hideNavPropertyReducer, propertyKey),
  showNavSubject: (subjectKey) =>
    applyReducer(get, set, showNavSubjectReducer, subjectKey),
  hideNavSubject: (subjectKey) =>
    applyReducer(get, set, hideNavSubjectReducer, subjectKey),
  loadResourceFinished: (resourceKey) =>
    applyReducer(get, set, loadResourceFinishedReducer, resourceKey),
  saveResourceFinished: (resourceKey) =>
    applyReducer(get, set, saveResourceFinishedReducer, { resourceKey }),
  addSubject: (subject) =>
    applyReducer(get, set, addSubjectReducer, subject),
  addProperty: (property) =>
    applyReducer(get, set, addPropertyReducer, property),
  addValue: (value, siblingValueKey) =>
    applyReducer(get, set, addValueReducer, { value, siblingValueKey }),
  updateValue: (payload) =>
    applyReducer(get, set, updateValueReducer, payload),
  removeValue: (valueKey) =>
    applyReducer(get, set, removeValueReducer, valueKey),
  removeSubject: (subjectKey) =>
    applyReducer(get, set, removeSubjectReducer, subjectKey),
  clearResource: (resourceKey) =>
    applyReducer(get, set, clearResourceReducer, resourceKey),
  setResourceGroup: (resourceKey, group, editGroups) =>
    applyReducer(get, set, setResourceGroupReducer, {
      resourceKey,
      group,
      editGroups,
    }),
  setValueOrder: (valueKey, index) =>
    applyReducer(get, set, setValueOrderReducer, { valueKey, index }),
  setVersions: (resourceKey, versions) =>
    applyReducer(get, set, setVersionsReducer, { resourceKey, versions }),
  clearVersions: (resourceKey) =>
    applyReducer(get, set, clearVersionsReducer, resourceKey),
  setValuePropertyURI: (valueKey, uri) =>
    applyReducer(get, set, setValuePropertyURIReducer, { valueKey, uri }),
  setPropertyPropertyURI: (propertyKey, uri) =>
    applyReducer(get, set, setPropertyPropertyURIReducer, { propertyKey, uri }),
  setClasses: (subjectKey, classes) =>
    applyReducer(get, set, setClassesReducer, { subjectKey, classes }),
  setSubjectComponentList: (subjectKey, uri) =>
    applyReducer(get, set, setSubjectComponentListReducer, { subjectKey, uri }),
  setResourceChanged: (resourceKey) =>
    applyReducer(get, set, setResourceChangedReducer, resourceKey),

  // Language actions
  setLanguage: (valueKey, lang) =>
    applyReducer(get, set, setLanguageReducer, { valueKey, lang }),
  languagesReceived: (payload) =>
    applyReducer(get, set, languagesReceivedReducer, payload),
  setDefaultLang: (resourceKey, lang) =>
    applyReducer(get, set, setDefaultLangReducer, { resourceKey, lang }),

  // Group actions
  groupsReceived: (groups) =>
    applyReducer(get, set, groupsReceivedReducer, groups),

  // Template actions
  addTemplates: (template) =>
    applyReducer(get, set, addTemplatesReducer, template),

  // Export actions
  exportsReceived: (exports) =>
    applyReducer(get, set, exportsReceivedReducer, exports),

  // Lookup actions
  lookupOptionsRetrieved: (uri, lookup) =>
    applyReducer(get, set, lookupOptionsRetrievedReducer, { uri, lookup }),

  // Relationship actions
  setRelationships: (resourceKey, relationships) =>
    applyReducer(get, set, setRelationshipsReducer, {
      resourceKey,
      relationships,
    }),
  clearRelationships: (resourceKey) =>
    applyReducer(get, set, clearRelationshipsReducer, resourceKey),
}))

export default useEntitiesStore
