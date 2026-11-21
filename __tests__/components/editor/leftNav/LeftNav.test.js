import React from "react"
import { fireEvent, screen } from "@testing-library/react"
import LeftNav from "components/editor/leftNav/LeftNav"
import * as sinopiaApi from "sinopiaApi"
import { createStore, renderComponent } from "testUtils"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

const workUri = "http://localhost:3000/resource/work1"

const renderNav = (state) => {
  renderComponent(
    <LeftNav resource={state.entities.subjects.t9zVwg2zO} />,
    createStore(state),
  )
}

describe("<LeftNav />", () => {
  beforeEach(() => {
    jest
      .spyOn(sinopiaApi, "fetchResourceVersions")
      .mockResolvedValue([
        { id: 1, timestamp: "2020-08-20T11:34:40.887Z", user: "havram" },
      ])
    jest
      .spyOn(sinopiaApi, "fetchResource")
      .mockReturnValue(new Promise(() => {}))
  })
  afterEach(() => jest.restoreAllMocks())

  it("lists the properties, marking required ones, with no Navigation tab", () => {
    const state = createState({ hasResourceWithLiteral: true })
    state.entities.propertyTemplates[
      "ld4p:RT:bf2:Title:AbbrTitle > http://id.loc.gov/ontologies/bibframe/mainTitle"
    ].required = true
    renderNav(state)

    screen.getByText("Abbreviated Title", { selector: ".left-nav-header" })
    expect(
      screen.getByText("*", { selector: ".left-nav-required" }),
    ).toBeInTheDocument()
    expect(screen.queryByText("Navigation")).not.toBeInTheDocument()
  })

  it("shows Versions collapsed, and opens it on click", async () => {
    renderNav(createState({ hasResourceWithLiteral: true }))

    const toggle = screen.getByRole("button", { name: "Versions" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Compare from/to")).not.toBeInTheDocument()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "true")
    await screen.findByText("Compare from/to")

    fireEvent.click(toggle)
    expect(screen.queryByText("Compare from/to")).not.toBeInTheDocument()
  })

  it("shows Relationships only when the resource has some", () => {
    const state = createState({ hasResourceWithLiteral: true })
    renderNav(state)
    expect(
      screen.queryByRole("button", { name: "Relationships" }),
    ).not.toBeInTheDocument()
  })

  it("shows Relationships collapsed when the resource has some", () => {
    const state = createState({ hasResourceWithLiteral: true })
    state.entities.subjects.t9zVwg2zO.bfWorkRefs = [workUri]
    renderNav(state)

    const toggle = screen.getByRole("button", { name: "Relationships" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    screen.getByText("Loading ...")
  })

  it("shows neither box for an unsaved resource", () => {
    const state = createState({ hasResourceWithLiteral: true })
    state.entities.subjects.t9zVwg2zO.uri = null
    state.entities.subjects.t9zVwg2zO.bfWorkRefs = [workUri]
    renderNav(state)

    expect(
      screen.queryByRole("button", { name: "Versions" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Relationships" }),
    ).not.toBeInTheDocument()
  })
})
