import React from "react"
import { renderComponent } from "testUtils"
import { fireEvent, screen } from "@testing-library/react"
import SearchList from "components/dashboard/SearchList"
import * as server from "sinopiaSearch"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

describe("<SearchList />", () => {
  const searches = [
    {
      authorityUri: "urn:ld4p:sinopia",
      authorityLabel: "Sinopia resources",
      query: "twain",
    },
  ]

  it("re-runs a saved search against Sinopia", async () => {
    const mockGetSearchResults = jest.fn()
    server.getSearchResultsWithFacets = mockGetSearchResults.mockResolvedValue([
      {
        totalHits: 0,
        results: [],
      },
    ])

    renderComponent(<SearchList searches={searches} />)

    screen.getByText("Sinopia resources")

    fireEvent.click(screen.getByTestId("Search twain (Sinopia resources)"))

    expect(mockGetSearchResults).toBeCalledWith(
      "twain",
      { startOfRange: 0 },
      undefined
    )
  })
})
