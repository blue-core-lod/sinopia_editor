// Copyright 2019 Stanford University see LICENSE for license

import { createStore, applyMiddleware, compose } from "redux"
import thunk from "redux-thunk"
import reducer from "./reducers/index"

export const initialState = {
  entities: {
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
    relationships: {}, // Inferred relationship loaded from API: {<resourceKey>: {bfAdminMetadataRefs, bfItemRefs, bfInstanceRefs, bfWorkRefs}
    subjects: {},
    subjectTemplates: {},
    values: {},
    versions: {}, // {<resourceKey>: [versions...]}
  },
}

let composeEnhancers

if (process.env.NODE_ENV === "development") {
  composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose
} else {
  composeEnhancers = compose
}

const store = createStore(
  reducer,
  initialState,
  composeEnhancers(applyMiddleware(thunk))
)

export default store
