import { create } from "zustand"
import Config from "Config"
import _ from "lodash"

const addToHistory = (historyItems, newItem, compareFunc) => {
  const filtered = historyItems.filter((checkItem) =>
    compareFunc(newItem, checkItem)
  )
  return [newItem, ...filtered].slice(0, 10)
}

const useHistoryStore = create((set, get) => ({
  templates: [],
  searches: [],
  resources: [],

  addTemplateHistory: (template) => {
    const result = {
      id: template.key,
      resourceLabel: template.label,
      resourceURI: template.class,
      uri: template.uri,
      author: template.author,
      remark: template.remark,
      date: template.date,
      group: template.group,
      editGroups: template.editGroups,
    }
    if (result.id === Config.rootResourceTemplateId) return
    set({
      templates: addToHistory(
        get().templates,
        result,
        (newItem, checkItem) => newItem.id !== checkItem.id
      ),
    })
  },

  addTemplateHistoryByResult: (result) => {
    if (result.id === Config.rootResourceTemplateId) return
    set({
      templates: addToHistory(
        get().templates,
        result,
        (newItem, checkItem) => newItem.id !== checkItem.id
      ),
    })
  },

  addSearchHistory: (payload) => {
    set({
      searches: addToHistory(
        get().searches,
        payload,
        (newItem, checkItem) => !_.isEqual(newItem, checkItem)
      ),
    })
  },

  addResourceHistoryByResult: (result) => {
    set({
      resources: addToHistory(
        get().resources,
        result,
        (newItem, checkItem) => newItem.uri !== checkItem.uri
      ),
    })
  },

  addResourceHistory: (payload) => {
    const result = {
      uri: payload.resourceUri,
      label: payload.resourceUri,
      type: payload.type ? [payload.type] : undefined,
      modified: payload.modified,
      group: payload.group,
      editGroups: payload.editGroups,
    }
    set({
      resources: addToHistory(
        get().resources,
        result,
        (newItem, checkItem) => newItem.uri !== checkItem.uri
      ),
    })
  },
}))

export default useHistoryStore
