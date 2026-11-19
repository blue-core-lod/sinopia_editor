import React from "react"
import { screen } from "@testing-library/react"
import ResourceTemplate from "components/templates/ResourceTemplate"
import * as sinopiaSearch from "sinopiaSearch"
import {
  renderComponent,
  createStore,
  createHistory,
} from "../../testUtilities/testUtils"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

describe("<ResourceTemplate />", () => {
  it("renders the page heading", async () => {
    jest
      .spyOn(sinopiaSearch, "getTemplateSearchResults")
      .mockResolvedValue({ totalHits: 0, results: [] })
    renderComponent(
      <ResourceTemplate />,
      createStore(createState()),
      createHistory(),
    )

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Resource templates",
      }),
    ).toBeInTheDocument()
  })
})
