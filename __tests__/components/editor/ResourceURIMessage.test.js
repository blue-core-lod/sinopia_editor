import React from "react"
import { screen } from "@testing-library/react"
import ResourceURIMessage from "components/editor/ResourceURIMessage"
import { createStore, renderComponent } from "testUtils"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

describe("<ResourceURIMessage />", () => {
  const versionUri =
    "https://bluecore-dev.stanford.edu/profiles/3db30d3a-7a3e-4762-a28c-1a0efc244345/version/48213"

  const pinTemplate = (state) => {
    const template =
      state.entities.subjectTemplates["ld4p:RT:bf2:Title:AbbrTitle"]
    template.versionUri = versionUri
    return state
  }

  it("shows the template version a resource is pinned to", () => {
    const state = pinTemplate(createState({ hasResourceWithLiteral: true }))

    renderComponent(
      <ResourceURIMessage resourceKey="t9zVwg2zO" />,
      createStore(state),
    )

    screen.getByText("URI for this resource:", { exact: false })
    screen.getByText(`Template version: <${versionUri}>`, { exact: false })
    screen.getByTestId("Copy template version URI to clipboard")
  })

  it("shows the template version of an unsaved resource", () => {
    const state = pinTemplate(createState({ hasResourceWithLiteral: true }))
    state.entities.subjects.t9zVwg2zO.uri = null

    renderComponent(
      <ResourceURIMessage resourceKey="t9zVwg2zO" />,
      createStore(state),
    )

    expect(
      screen.queryByText("URI for this resource:", { exact: false }),
    ).not.toBeInTheDocument()
    screen.getByText(`Template version: <${versionUri}>`, { exact: false })
  })

  it("shows no template version for an unversioned template", () => {
    const state = createState({ hasResourceWithLiteral: true })

    renderComponent(
      <ResourceURIMessage resourceKey="t9zVwg2zO" />,
      createStore(state),
    )

    screen.getByText("URI for this resource:", { exact: false })
    expect(
      screen.queryByText("Template version:", { exact: false }),
    ).not.toBeInTheDocument()
  })
})
