// Copyright 2020 Stanford University see LICENSE for license
import React from "react"
import { Routes, Route } from "react-router-dom"
import { renderComponent, createHistory } from "testUtils"
import { screen } from "@testing-library/react"
import Vocab from "components/vocabulary/Vocab"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

/*
 * Vocab reads its URL segments with useParams() rather than the react-router v5
 * props.match it used to receive, so these render it through the same route
 * patterns App.jsx declares. That exercises the route config too, instead of
 * hand-feeding a match object the app no longer passes.
 */
const renderVocab = (path) =>
  renderComponent(
    <Routes>
      <Route path="/vocabulary" element={<Vocab />} />
      <Route path="/vocabulary/:element" element={<Vocab />} />
      <Route path="/vocabulary/:element/:sub" element={<Vocab />} />
    </Routes>,
    undefined,
    createHistory([path]),
  )

describe("Sinopia Vocabulary", () => {
  it("displays the vocabulary used by Sinopia", async () => {
    renderVocab("/vocabulary")

    // Search for Heading on page
    await screen.findByText("Vocabulary", { selector: "h1" })

    // Search for specific elements on vocab page
    await screen.findByText("hasAuthor")
  })

  it("displays a dereference element in the Vocabulary", async () => {
    renderVocab("/vocabulary/hasResourceTemplate")

    // Checks if resolved page has the correct Heading
    await screen.findByText("hasResourceTemplate", { selector: "h1" })
  })

  it("displays a dereferenced element with a subelement", async () => {
    renderVocab("/vocabulary/propertyType/resource")

    // Checks if resolved page has the correct Heading
    await screen.findByText("propertyType/resource", { selector: "h1" })
  })

  it("displays error page if the element does not exist", async () => {
    renderVocab("/vocabulary/garbage")

    // Displays message if the element is not found
    await screen.findByText("garbage not found")
  })
})
