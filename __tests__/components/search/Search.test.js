import { renderApp } from "testUtils"
import { featureSetup } from "featureUtils"
import { fireEvent, waitFor, screen } from "@testing-library/react"
import * as server from "sinopiaSearch"
import Config from "Config"
import * as sinopiaApi from "sinopiaApi"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

featureSetup()

describe("<Search />", () => {
  jest.spyOn(sinopiaApi, "putUserHistory").mockResolvedValue()

  it("requests a Sinopia search", async () => {
    const mockGetSearchResults = jest.fn()
    server.getSearchResultsWithFacets = mockGetSearchResults.mockResolvedValue([
      {
        totalHits: 1,
        results: [
          {
            uri: "resource/ca0d53d0-2b99-4f75-afb0-739a6f0af4f4",
            label: "foo",
            title: ["foo"],
            type: ["http://id.loc.gov/ontologies/bibframe/Title"],
          },
        ],
      },
    ])

    renderApp()
    fireEvent.click(screen.getByText("Linked Data Editor", { selector: "a" }))

    // Enter a query
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "foo" },
    })

    // Click search
    fireEvent.click(screen.getByTestId("Submit search"))

    // Called once
    expect(mockGetSearchResults).toBeCalledWith(
      "foo",
      { startOfRange: 0 },
      undefined
    )

    // Result
    await screen.findByText(/foo/)

    screen.getByText("Title", { selector: "span.resource-label" })
  })

  it("requests on enter", () => {
    const mockGetSearchResults = jest.fn()
    server.getSearchResultsWithFacets = mockGetSearchResults.mockResolvedValue([
      {
        totalHits: 0,
        results: [],
      },
    ])

    renderApp()
    fireEvent.click(screen.getByText("Linked Data Editor", { selector: "a" }))

    // Enter a query
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "foo" },
    })

    // Hit enter
    fireEvent.keyPress(screen.getByLabelText("Search"), {
      key: "Enter",
      code: 13,
      charCode: 13,
    })

    // Called once
    expect(mockGetSearchResults).toBeCalledWith(
      "foo",
      { startOfRange: 0 },
      undefined
    )
  })

  it("ignores when query is blank", () => {
    const mockGetSearchResults = jest.fn()

    renderApp()
    fireEvent.click(screen.getByText("Linked Data Editor", { selector: "a" }))

    // Hit enter
    fireEvent.keyPress(screen.getByLabelText("Search"), {
      key: "Enter",
      code: 13,
      charCode: 13,
    })

    // Not called
    expect(mockGetSearchResults.mock.calls.length).toBe(0)
  })

  it("displays an error message", async () => {
    server.getSearchResultsWithFacets = jest.fn().mockResolvedValue([
      {
        totalHits: 0,
        results: [],
        error: new Error("Grrr..."),
      },
    ])

    renderApp()
    fireEvent.click(screen.getByText("Linked Data Editor", { selector: "a" }))

    // Enter a query
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "foo" },
    })

    // Click search
    fireEvent.click(screen.getByTestId("Submit search"))

    await screen.findByText("An error occurred while searching: Error: Grrr...")
  })

  it("retains sort order when paging", async () => {
    jest.spyOn(Config, "searchResultsPerPage", "get").mockReturnValue(2)
    const mockGetSearchResults = jest.fn()
    server.getSearchResultsWithFacets = mockGetSearchResults.mockResolvedValue([
      {
        totalHits: 3,
        results: [
          {
            uri: "resource/ca0d53d0-2b99-4f75-afb0-739a6f0af4f4",
            label: "foo1",
            title: ["foo1"],
            type: ["http://id.loc.gov/ontologies/bibframe/Title"],
          },
          {
            uri: "resource/ca0d53d0-2b99-4f75-afb0-739a6f0af4f5",
            label: "foo2",
            title: ["foo2"],
            type: ["http://id.loc.gov/ontologies/bibframe/Title"],
          },
          {
            uri: "resource/ca0d53d0-2b99-4f75-afb0-739a6f0af4f6",
            label: "foo3",
            title: ["foo3"],
            type: ["http://id.loc.gov/ontologies/bibframe/Title"],
          },
        ],
      },
    ])

    renderApp()
    fireEvent.click(screen.getByText("Linked Data Editor", { selector: "a" }))

    // Enter a query
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "foo" },
    })

    // Click search
    fireEvent.click(screen.getByTestId("Submit search"))

    await screen.findByText("Sort by")

    // Change sort order
    screen.getByText("Relevance", { selector: "button.active" })
    fireEvent.click(screen.getByText("Sort by"))
    fireEvent.click(screen.getByText("Modified date, newest first"))

    await waitFor(() =>
      expect(
        screen.queryByText("Relevance", { selector: "button.active" })
      ).not.toBeInTheDocument()
    )
    screen.getByText("Modified date, newest first", {
      selector: "button.active",
    })

    fireEvent.click(screen.getByText("›"))

    await screen.findByText("2", { selector: "li.active > button" })
    screen.getByText("Modified date, newest first", {
      selector: "button.active",
    })

    expect(mockGetSearchResults.mock.calls).toEqual([
      ["foo", { startOfRange: 0 }, undefined],
      [
        "foo",
        {
          startOfRange: 0,
          resultsPerPage: 2,
          sortField: "modified",
          sortOrder: "desc",
        },
        undefined,
      ],
      [
        "foo",
        {
          startOfRange: 2,
          resultsPerPage: 2,
          sortField: "modified",
          sortOrder: "desc",
        },
        undefined,
      ],
    ])
  })
})
