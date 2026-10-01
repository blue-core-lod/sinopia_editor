// Copyright 2019 Stanford University see LICENSE for license

import {
  addTemplateHistory,
  addTemplateHistoryByResult,
  addSearchHistory,
  addResourceHistoryByResult,
  addResourceHistory,
} from "reducers/history"
import { createState } from "stateUtils"
import Config from "Config"

describe("addTemplateHistory", () => {
  const template = {
    key: "ld4p:RT:bf2:Identifiers:LCCN",
    uri: "http://localhost:3000/resource/ld4p:RT:bf2:Identifiers:LCCN",
    id: "ld4p:RT:bf2:Identifiers:LCCN",
    class: "http://id.loc.gov/ontologies/bibframe/Lccn",
    label: "LCCN",
    author: "LD4P",
    remark: "Library of Congress Card Number",
    date: "2019-08-19",
    group: "stanford",
    editGroups: ["cornell"],
  }

  it("transforms to a result", () => {
    const state = createState()
    const newState = addTemplateHistory(state.history, { payload: template })

    expect(newState.templates).toEqual([
      {
        author: "LD4P",
        date: "2019-08-19",
        id: "ld4p:RT:bf2:Identifiers:LCCN",
        remark: "Library of Congress Card Number",
        resourceLabel: "LCCN",
        resourceURI: "http://id.loc.gov/ontologies/bibframe/Lccn",
        uri: "http://localhost:3000/resource/ld4p:RT:bf2:Identifiers:LCCN",
        group: "stanford",
        editGroups: ["cornell"],
      },
    ])
  })

  // A version-pinned template's state key is its version URI, but history is
  // deduplicated against addTemplateHistoryByResult, which identifies a
  // template by its human id. Recording the key here would list one template
  // twice and link the entry at a frozen snapshot.
  it("identifies a version-pinned template by its id and living profile URI", () => {
    const state = createState()
    const profileUri =
      "https://bluecore-dev.stanford.edu/profiles/3db30d3a-7a3e-4762-a28c-1a0efc244345"

    const newState = addTemplateHistory(state.history, {
      payload: {
        ...template,
        key: `${profileUri}/version/48213`,
        uri: `${profileUri}/version/48213`,
        profileUri,
        version: 48213,
      },
    })

    expect(newState.templates[0].id).toEqual("ld4p:RT:bf2:Identifiers:LCCN")
    expect(newState.templates[0].uri).toEqual(profileUri)
  })

  it("adds items uniquely", () => {
    let state = addTemplateHistory(createState().history, {
      payload: { id: "template1" },
    })
    state = addTemplateHistory(state, { payload: { id: "template2" } })
    state = addTemplateHistory(state, { payload: { id: "template1" } })

    expect(state.templates.map((template) => template.id)).toEqual([
      "template1",
      "template2",
    ])
  })

  it("limits to 10", () => {
    const state = createState()
    state.history.templates = [
      { id: "template1" },
      { id: "template2" },
      { id: "template3" },
      { id: "template4" },
      { id: "template5" },
      { id: "template6" },
      { id: "template7" },
      { id: "template8" },
      { id: "template9" },
      { id: "template10" },
    ]

    const newState = addTemplateHistory(state.history, {
      payload: { id: "template11" },
    })

    expect(newState.templates.map((template) => template.id)).toEqual([
      "template11",
      "template1",
      "template2",
      "template3",
      "template4",
      "template5",
      "template6",
      "template7",
      "template8",
      "template9",
    ])
  })

  it("does not add root resource template to history", () => {
    const state = createState()
    const newState = addTemplateHistory(state.history, {
      payload: { id: Config.rootResourceTemplateId },
    })

    expect(newState.templates).toEqual([])
  })
})

describe("addTemplateHistoryByResult", () => {
  const result = {
    author: "LD4P",
    date: "2019-08-19",
    id: "ld4p:RT:bf2:Identifiers:LCCN",
    remark: "Library of Congress Card Number",
    resourceLabel: "LCCN",
    resourceURI: "http://id.loc.gov/ontologies/bibframe/Lccn",
    uri: "http://localhost:3000/resource/ld4p:RT:bf2:Identifiers:LCCN",
    group: "stanford",
    editGroups: ["cornell"],
  }

  it("adds to historical templates", () => {
    const state = createState()
    const newState = addTemplateHistoryByResult(state.history, {
      payload: result,
    })

    expect(newState.templates).toEqual([result])
  })
})

describe("addSearchHistory", () => {
  const search1 = { authority: "sinopia", query: "commodore" }
  const search2 = { authority: "sinopia", query: "atari" }

  it("adds items uniquely", () => {
    let state = addSearchHistory(createState().history, { payload: search1 })
    state = addSearchHistory(state, { payload: search2 })
    state = addSearchHistory(state, { payload: search1 })

    expect(state.searches).toEqual([search1, search2])
  })
})

describe("addResourceHistoryByResult", () => {
  const result = {
    uri: "http://localhost:3000/resource/3d831f47-e686-4b8f-9086-11383b2af762",
    label:
      "http://localhost:3000/resource/3d831f47-e686-4b8f-9086-11383b2af762",
    type: ["http://id.loc.gov/ontologies/bibframe/TableOfContents"],
    modified: "2020-10-05T14:31:16.612Z",
    group: "stanford",
    editGroups: ["cornell"],
  }

  it("adds to historical resources", () => {
    const state = createState()
    const newState = addResourceHistoryByResult(state.history, {
      payload: result,
    })

    expect(newState.resources).toEqual([result])
  })
})

describe("addResourceHistory", () => {
  const resource = {
    resourceUri:
      "http://localhost:3000/resource/f383bfff-5364-47a3-a081-8c9e2d79f43f",
    type: "http://id.loc.gov/ontologies/bibframe/TableOfContents",
    group: "stanford",
    editGroups: ["cornell"],
    modified: "2020-10-05T14:38:19.704Z",
  }

  it("transforms to a result", () => {
    const state = createState()
    const newState = addResourceHistory(state.history, { payload: resource })

    expect(newState.resources).toEqual([
      {
        uri: "http://localhost:3000/resource/f383bfff-5364-47a3-a081-8c9e2d79f43f",
        label:
          "http://localhost:3000/resource/f383bfff-5364-47a3-a081-8c9e2d79f43f",
        type: ["http://id.loc.gov/ontologies/bibframe/TableOfContents"],
        modified: "2020-10-05T14:38:19.704Z",
        group: "stanford",
        editGroups: ["cornell"],
      },
    ])
  })
})
