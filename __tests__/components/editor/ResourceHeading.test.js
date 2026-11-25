import React from "react"
import { screen } from "@testing-library/react"
import ResourceHeading from "components/editor/ResourceHeading"
import WorkViewToggle from "components/editor/WorkViewToggle"
import { createStore, renderComponent } from "testUtils"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

const BF = "http://id.loc.gov/ontologies/bibframe/"
const templateId = "ld4p:RT:bf2:Title:AbbrTitle"

const stateFor = (templateClass) => {
  const state = createState({ hasResourceWithLiteral: true })
  if (templateClass) {
    state.entities.subjectTemplates[templateId].class = templateClass
  }
  return state
}

const renderHeading = (state) =>
  renderComponent(
    <ResourceHeading resource={state.entities.subjects.t9zVwg2zO} />,
    createStore(state),
  )

describe("<ResourceHeading />", () => {
  it("shows a W badge, the title, and preview and copy buttons for a work", () => {
    renderHeading(stateFor(`${BF}Work`))

    const badge = screen.getByRole("img", { name: "Work" })
    expect(badge).toHaveTextContent("W")
    expect(badge).toHaveClass("kind-badge-work")
    screen.getByText("Abbreviated Title", { selector: ".resource-label" })
    screen.getByRole("button", { name: "Preview resource" })
    screen.getByRole("button", {
      name: "Copy this resource to a new resource",
    })
  })

  it("shows an I badge for an instance", () => {
    renderHeading(stateFor(`${BF}Instance`))

    expect(screen.getByRole("img", { name: "Instance" })).toHaveTextContent("I")
  })

  it("shows no badge for other kinds of resource", () => {
    renderHeading(stateFor())

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })
})

describe("<WorkViewToggle />", () => {
  const renderToggle = (state) =>
    renderComponent(
      <WorkViewToggle resourceKey="t9zVwg2zO" />,
      createStore(state),
    )

  it("shows Work selected for a work", () => {
    renderToggle(stateFor(`${BF}Work`))

    screen.getByRole("group", { name: "Work view" })
    expect(screen.getByRole("button", { name: "Work" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    // Wired up in a later change
    expect(
      screen.getByRole("button", { name: "Work and Instance" }),
    ).toBeDisabled()
  })

  it("is not shown for an instance", () => {
    renderToggle(stateFor(`${BF}Instance`))

    expect(
      screen.queryByRole("group", { name: "Work view" }),
    ).not.toBeInTheDocument()
  })
})
