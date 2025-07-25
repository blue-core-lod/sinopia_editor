// Copyright 2021 Stanford University see LICENSE for license
import React from "react"
import { createStore, renderComponent } from "testUtils"
import { screen } from "@testing-library/react"
import { createState } from "stateUtils"
import { selectSubjectAndPropertyTemplates } from "selectors/templates"
import PropertyLabelInfoTooltip from "components/editor/property/PropertyLabelInfoTooltip"

let mockKeycloak

jest.mock("keycloak-js", () => {
  mockKeycloak = {
    init: jest.fn(() => Promise.resolve(true)),
    token: "Secret-Token",
    authenticated: true,
    isTokenExpired: jest.fn(),
    updateToken: jest.fn(),
    tokenParsed: {
      preferred_username: "Foo McBar",
    },
  }

  return jest.fn().mockImplementation((config) => {
    return mockKeycloak
  })
})

describe("<PropertyLabelInfoTooltip />", () => {
  it("displays remark without link", () => {
    const state = createState({ hasResourceWithNestedResource: true })
    const store = createStore(state)
    const propertyTemplate = selectSubjectAndPropertyTemplates(
      state,
      "resourceTemplate:testing:uber1"
    )
    renderComponent(
      <PropertyLabelInfoTooltip propertyTemplate={propertyTemplate} />,
      store
    )
    expect(screen.getByRole("link").getAttribute("data-bs-content")).toBe(
      "Template for testing purposes."
    )
  })

  it("displays remark with a URL that is auto linked", () => {
    const state = createState({ hasResourceWithNestedResource: true })
    const store = createStore(state)
    const propertyTemplate = selectSubjectAndPropertyTemplates(
      state,
      "resourceTemplate:testing:uber2"
    )
    renderComponent(
      <PropertyLabelInfoTooltip propertyTemplate={propertyTemplate} />,
      store
    )
    expect(screen.getByRole("link").getAttribute("data-bs-content")).toBe(
      'Template for testing purposes with single repeatable literal with a link to Stanford at <a target="_blank" href="https://www.stanford.edu">https://www.stanford.edu</a>'
    )
  })
})
