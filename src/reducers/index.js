// Copyright 2018, 2019 Stanford University see LICENSE for license

import { combineReducers } from "redux"
import { setLanguage, languagesReceived, setDefaultLang } from "./languages"
import { groupsReceived } from "./groups"
import {
  setBaseURL,
  hideProperty,
  showProperty,
  showNavProperty,
  hideNavProperty,
  showNavSubject,
  hideNavSubject,
  addSubject,
  addProperty,
  addValue,
  removeValue,
  removeSubject,
  clearResource,
  saveResourceFinished,
  loadResourceFinished,
  setResourceGroup,
  setValueOrder,
  updateValue,
  setVersions,
  clearVersions,
  setValuePropertyURI,
  setPropertyPropertyURI,
  setClasses,
  setResourceChanged,
  setSubjectComponentList,
} from "./resources"
import { setRelationships, clearRelationships } from "./relationships"
import { exportsReceived } from "./exports"
import { addTemplates } from "./templates"
import { lookupOptionsRetrieved } from "./lookups"

const entityHandlers = {
  ADD_PROPERTY: addProperty,
  ADD_SUBJECT: addSubject,
  ADD_TEMPLATES: addTemplates,
  ADD_VALUE: addValue,
  CLEAR_RELATIONSHIPS: clearRelationships,
  CLEAR_RESOURCE: clearResource,
  CLEAR_VERSIONS: clearVersions,
  EXPORTS_RECEIVED: exportsReceived,
  HIDE_NAV_PROPERTY: hideNavProperty,
  HIDE_NAV_SUBJECT: hideNavSubject,
  HIDE_PROPERTY: hideProperty,
  GROUPS_RECEIVED: groupsReceived,
  LANGUAGES_RECEIVED: languagesReceived,
  LANGUAGE_SELECTED: setLanguage,
  LOAD_RESOURCE_FINISHED: loadResourceFinished,
  LOOKUP_OPTIONS_RETRIEVED: lookupOptionsRetrieved,
  REMOVE_SUBJECT: removeSubject,
  REMOVE_VALUE: removeValue,
  SAVE_RESOURCE_FINISHED: saveResourceFinished,
  SET_BASE_URL: setBaseURL,
  SET_CLASSES: setClasses,
  SET_SUBJECT_COMPONENT_LIST: setSubjectComponentList,
  SET_DEFAULT_LANG: setDefaultLang,
  SET_VALUE_PROPERTY_URI: setValuePropertyURI,
  SET_PROPERTY_PROPERTY_URI: setPropertyPropertyURI,
  SET_RELATIONSHIPS: setRelationships,
  SET_RESOURCE_GROUP: setResourceGroup,
  SET_RESOURCE_CHANGED: setResourceChanged,
  SET_VALUE_ORDER: setValueOrder,
  SET_VERSIONS: setVersions,
  SHOW_NAV_PROPERTY: showNavProperty,
  SHOW_NAV_SUBJECT: showNavSubject,
  SHOW_PROPERTY: showProperty,
  UPDATE_VALUE: updateValue,
}

export const createReducer =
  (handlers) =>
  (state = {}, action) => {
    const fn = handlers[action.type]
    return fn ? fn(state, action) : state
  }

const appReducer = combineReducers({
  entities: createReducer(entityHandlers),
})

export default appReducer
