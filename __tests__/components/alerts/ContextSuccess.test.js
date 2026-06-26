// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { screen } from "@testing-library/react"
import ContextSuccess from "components/alerts/ContextSuccess"
import { createStore, renderComponent } from "testUtils"
import { createState } from "stateUtils"

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

  return jest.fn().mockImplementation(() => mockKeycloak)
})

describe("<ContextSuccess />", () => {
  it("renders nothing when there are no success messages", () => {
    const store = createStore(createState())
    const { container } = renderComponent(<ContextSuccess />, store)
    expect(container.firstChild).toBeNull()
  })

  it("renders nothing when the success list for the context key is empty", () => {
    const state = createState()
    state.editor.successes = { testErrorKey: [] }
    const store = createStore(state)
    const { container } = renderComponent(<ContextSuccess />, store)
    expect(container.firstChild).toBeNull()
  })

  it("renders success messages for the context key", () => {
    const state = createState()
    state.editor.successes = { testErrorKey: ["Saved successfully"] }
    const store = createStore(state)
    renderComponent(<ContextSuccess />, store)
    expect(screen.getByRole("alert")).toHaveClass("alert-success")
    expect(screen.getByText("Saved successfully")).toBeInTheDocument()
  })

  it("renders multiple success messages", () => {
    const state = createState()
    state.editor.successes = {
      testErrorKey: ["Resource saved", "Export complete"],
    }
    const store = createStore(state)
    renderComponent(<ContextSuccess />, store)
    expect(screen.getByText("Resource saved")).toBeInTheDocument()
    expect(screen.getByText("Export complete")).toBeInTheDocument()
  })

  it("does not render messages belonging to a different key", () => {
    const state = createState()
    state.editor.successes = { otherKey: ["Should not appear"] }
    const store = createStore(state)
    const { container } = renderComponent(<ContextSuccess />, store)
    expect(container.firstChild).toBeNull()
  })
})
