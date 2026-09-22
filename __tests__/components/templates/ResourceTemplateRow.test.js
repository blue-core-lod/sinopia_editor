import React from "react"
import { screen } from "@testing-library/react"
import ResourceTemplateSearchResult from "components/templates/ResourceTemplateSearchResult"
import { createState } from "stateUtils"
import { createStore, renderComponent } from "testUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

const label = "Uber template1"

// group is one of the default user's groups, so canEdit()/canCreate() pass and
// the role is the only thing deciding whether a button renders.
const row = {
  id: "resourceTemplate:testing:uber1",
  resourceLabel: label,
  resourceURI: "http://id.loc.gov/ontologies/bibframe/Uber1",
  uri: "http://localhost:3000/resource/resourceTemplate:testing:uber1",
  author: "Foo McBar",
  group: "stanford",
  date: "2020-08-20T11:34:40.000Z",
  remark: "Template for testing",
}

const renderRowForRoles = (roles) => {
  const state = createState({ roles })
  renderComponent(
    <ResourceTemplateSearchResult results={[row]} />,
    createStore(state)
  )
}

describe("ResourceTemplateRow actions", () => {
  describe("when the user has template_create and template_edit", () => {
    it("renders create, copy, edit, and view", () => {
      renderRowForRoles(["template_create", "template_edit"])

      screen.getByTestId(`Create resource for ${label}`)
      screen.getByTestId(`Copy ${label}`)
      screen.getByTestId(`Edit ${label}`)
      screen.getByTestId(`View ${label}`)
    })
  })

  describe("when the user has template_create only", () => {
    it("renders create and copy but not edit", () => {
      renderRowForRoles(["template_create"])

      screen.getByTestId(`Create resource for ${label}`)
      screen.getByTestId(`Copy ${label}`)
      screen.getByTestId(`View ${label}`)
      expect(screen.queryByTestId(`Edit ${label}`)).not.toBeInTheDocument()
    })
  })

  describe("when the user has template_edit only", () => {
    it("renders edit but not create or copy", () => {
      renderRowForRoles(["template_edit"])

      screen.getByTestId(`Edit ${label}`)
      screen.getByTestId(`View ${label}`)
      expect(
        screen.queryByTestId(`Create resource for ${label}`)
      ).not.toBeInTheDocument()
      expect(screen.queryByTestId(`Copy ${label}`)).not.toBeInTheDocument()
    })
  })

  describe("when the user has neither template role", () => {
    it("renders view only", () => {
      renderRowForRoles([])

      screen.getByTestId(`View ${label}`)
      expect(
        screen.queryByTestId(`Create resource for ${label}`)
      ).not.toBeInTheDocument()
      expect(screen.queryByTestId(`Copy ${label}`)).not.toBeInTheDocument()
      expect(screen.queryByTestId(`Edit ${label}`)).not.toBeInTheDocument()
    })
  })
})
