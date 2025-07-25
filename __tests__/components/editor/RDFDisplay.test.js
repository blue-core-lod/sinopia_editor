// Copyright 2019 Stanford University see LICENSE for license
import React from "react"
import { render, screen } from "@testing-library/react"
import RDFDisplay from "components/editor/preview/RDFDisplay"
import GraphBuilder from "GraphBuilder"
import { createState } from "stateUtils"
import {
  selectFullSubject,
  selectCurrentResourceKey,
} from "selectors/resources"
import * as dataSetUtils from "utilities/Utilities"
import { featureSetup } from "featureUtils"

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

featureSetup()

describe("<RDFDisplay />", () => {
  const state = createState({ hasTwoLiteralResources: true })
  const dataset = new GraphBuilder(
    selectFullSubject(state, selectCurrentResourceKey(state))
  ).graph

  it("renders as a table", async () => {
    render(<RDFDisplay dataset={dataset} format="table" />)

    // There is a table
    screen.getByTestId("rdf-display-table")
    // With table headers
    screen.getByText("Subject", "th")
    screen.getByText("Predicate", "th")
    screen.getByText("Object", "th")
    // And table rows
    expect(
      screen.getAllByText("https://api.sinopia.io/resource/0894a8b3", "td")
    ).toHaveLength(3)
    expect(
      screen.getAllByText(
        "http://id.loc.gov/ontologies/bibframe/mainTitle",
        "td"
      )
    ).toHaveLength(1)
    screen.getByText("foo [en]", "td")
  })

  it("renders N-Triples", async () => {
    render(<RDFDisplay dataset={dataset} format="n-triples" />)

    await screen.findByText(
      /<https:\/\/api.sinopia.io\/resource\/0894a8b3> <http:\/\/id.loc.gov\/ontologies\/bibframe\/mainTitle> "foo"@en \./
    )
  })

  it("renders Turtle", async () => {
    render(<RDFDisplay dataset={dataset} format="turtle" />)

    await screen.findByText(
      /<http:\/\/id.loc.gov\/ontologies\/bibframe\/mainTitle> "foo"@en./
    )
  })

  it("renders JSON-LD", async () => {
    render(<RDFDisplay dataset={dataset} format="jsonld" />)

    await screen.findByText(/"@value": "foo",/)
  }, 10000)

  it("displays errors", async () => {
    jest
      .spyOn(dataSetUtils, "jsonldFromDataset")
      .mockRejectedValueOnce(new Error("Alert error"))

    render(<RDFDisplay dataset={dataset} format="jsonld" />)

    await screen.findByText(/Alert error/)
  })
})
