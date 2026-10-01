import React from "react"
import Editor from "components/editor/Editor"
import { createStore, createHistory, renderComponent } from "testUtils"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

// Editor's own job here is choosing the editor URL. Its children pull in the
// whole editing surface, which is covered elsewhere.
jest.mock(
  "components/Header",
  () =>
    function Header() {
      return null
    }
)
jest.mock(
  "components/editor/ResourceComponent",
  () =>
    function ResourceComponent() {
      return null
    }
)
jest.mock(
  "components/editor/EditorActions",
  () =>
    function EditorActions() {
      return null
    }
)
jest.mock(
  "components/editor/ResourcesNav",
  () =>
    function ResourcesNav() {
      return null
    }
)
jest.mock(
  "components/editor/GroupChoiceModal",
  () =>
    function GroupChoiceModal() {
      return null
    }
)
jest.mock(
  "components/editor/preview/EditorPreviewModal",
  () =>
    function EditorPreviewModal() {
      return null
    }
)
jest.mock(
  "components/editor/actions/MarcModal",
  () =>
    function MarcModal() {
      return null
    }
)
jest.mock(
  "components/editor/inputs/InputLang",
  () =>
    function InputLang() {
      return null
    }
)

describe("<Editor />", () => {
  const profileUri =
    "https://bluecore-dev.stanford.edu/profiles/3db30d3a-7a3e-4762-a28c-1a0efc244345"
  const versionUri = `${profileUri}/version/48213`

  // Only an unsaved resource routes by template; a saved one routes by its
  // resource id.
  const unsaved = (state) => {
    Object.values(state.entities.subjects).forEach((subject) => {
      subject.uri = null
    })
    return state
  }

  // Repoint the resource's template at a specific profile version, the way
  // loading a version-pinned reference does.
  const pinTemplate = (state) => {
    const templates = state.entities.subjectTemplates
    const [oldKey] = Object.keys(templates)
    templates[versionUri] = {
      ...templates[oldKey],
      key: versionUri,
      versionUri,
      profileUri,
      version: 48213,
    }
    delete templates[oldKey]
    Object.values(state.entities.subjects).forEach((subject) => {
      subject.subjectTemplateKey = versionUri
    })
    return state
  }

  it("routes an unsaved resource to its template id", async () => {
    const state = unsaved(createState({ hasResourceWithLiteral: true }))
    const history = createHistory(["/editor"])

    renderComponent(<Editor />, createStore(state), history)

    expect(history.location.pathname).toEqual(
      "/editor/ld4p:RT:bf2:Title:AbbrTitle"
    )
  })

  // /editor/:templateId matches a single path segment and means "create a new
  // resource from this template". A version-pinned template keys on a URI, so
  // routing on the key would emit a path the route cannot match.
  it("routes a version-pinned template to its id, not its version URI", async () => {
    const state = pinTemplate(
      unsaved(createState({ hasResourceWithLiteral: true }))
    )
    const history = createHistory(["/editor"])

    renderComponent(<Editor />, createStore(state), history)

    expect(history.location.pathname).toEqual(
      "/editor/ld4p:RT:bf2:Title:AbbrTitle"
    )
  })
})
