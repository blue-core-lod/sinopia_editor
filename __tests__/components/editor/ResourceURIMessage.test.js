import React from "react"
import { fireEvent, screen } from "@testing-library/react"
import ResourceURIMessage from "components/editor/ResourceURIMessage"
import { createStore, renderComponent } from "testUtils"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

describe("<ResourceURIMessage />", () => {
  const uri =
    "https://api.development.sinopia.io/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3f"

  it("links to the URI of a saved resource and copies it", async () => {
    const state = createState({ hasResourceWithLiteral: true })
    state.entities.subjects.t9zVwg2zO.uri = uri
    Object.assign(navigator, { clipboard: { writeText: jest.fn() } })

    renderComponent(
      <ResourceURIMessage resourceKey="t9zVwg2zO" />,
      createStore(state),
    )

    screen.getByText("URI:")
    expect(screen.getByRole("link", { name: uri })).toHaveAttribute("href", uri)

    fireEvent.click(screen.getByTestId("Copy URI to clipboard"))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(uri)
    await screen.findByTestId("Copied URI to clipboard")
  })

  it("shows nothing for an unsaved resource", () => {
    const state = createState({ hasResourceWithLiteral: true })
    state.entities.subjects.t9zVwg2zO.uri = null

    renderComponent(
      <ResourceURIMessage resourceKey="t9zVwg2zO" />,
      createStore(state),
    )

    expect(screen.queryByText("URI:")).not.toBeInTheDocument()
  })

  it("no longer shows the template version", () => {
    const state = createState({ hasResourceWithLiteral: true })
    state.entities.subjectTemplates["ld4p:RT:bf2:Title:AbbrTitle"].versionUri =
      "https://bluecore-dev.stanford.edu/profiles/3db30d3a-7a3e-4762-a28c-1a0efc244345/version/48213"

    renderComponent(
      <ResourceURIMessage resourceKey="t9zVwg2zO" />,
      createStore(state),
    )

    expect(
      screen.queryByText("Template version:", { exact: false }),
    ).not.toBeInTheDocument()
  })
})
