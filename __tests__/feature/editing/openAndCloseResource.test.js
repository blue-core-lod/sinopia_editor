import { renderApp, createHistory, createStore } from "testUtils"
import { fireEvent, screen } from "@testing-library/react"
import { createState } from "stateUtils"
import { featureSetup, resourceHeaderSelector } from "featureUtils"
import * as sinopiaSearch from "sinopiaSearch"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

featureSetup()

describe("switching between multiple resources", () => {
  const history = createHistory(["/templates"])
  const state = createState()
  const store = createStore(state)

  beforeAll(() => {
    jest.spyOn(sinopiaSearch, "getTemplateSearchResults").mockResolvedValue({
      results: [
        {
          id: "resourceTemplate:bf2:Instance",
          uri: "http://localhost:3000/resource/resourceTemplate:bf2:Instance",
          remark: "Fake Bibframe Instance",
          resourceLabel: "BF Instance",
          resourceURI: "http://id.loc.gov/ontologies/bibframe/Instance",
        },
        {
          id: "resourceTemplate:bf2:Title:Note",
          uri: "http://localhost:3000/resource/resourceTemplate:bf2:Title:Note",
          remark: "Note about the title",
          resourceLabel: "Title note",
          resourceURI: "http://id.loc.gov/ontologies/bibframe/Note",
        },
      ],
      totalHits: 2,
      options: {
        startOfRange: 0,
        resultsPerPage: 10,
      },
    })
  })

  it("switches between the active and inactive resources and closes resources", async () => {
    renderApp(store, history)

    fireEvent.change(screen.getByPlaceholderText(/Enter id, label/), {
      target: { value: "title" },
    })
    await screen.findByText("resourceTemplate:bf2:Title:Note")

    // open the template
    fireEvent.click(await screen.findByTestId("Create resource for Title note"))
    await screen.findByText("Title note", { selector: resourceHeaderSelector })

    // Open another template
    fireEvent.click(
      await screen.findByText("Resource templates", {
        selector: "a",
      }),
    )

    fireEvent.click(
      await screen.findByTestId("Create resource for BF Instance"),
    )
    await screen.findByText("BF Instance", {
      selector: resourceHeaderSelector,
    })

    // The unsaved Title note is in recently opened; the shown Instance is not.
    // (Their templates are there too, as RT boxes.)
    const openSelector =
      ".recently-opened-item:not(.recently-opened-template) .recently-opened-label"
    const titleNoteChip = screen.getByText("Title note", {
      selector: openSelector,
    })
    expect(
      screen.queryByText("BF Instance", { selector: openSelector }),
    ).not.toBeInTheDocument()

    // It does not have the the 'template' class for header color
    expect(screen.queryAllByTestId("template")).toHaveLength(0)

    // Click the Title note box
    fireEvent.click(titleNoteChip)

    // Title note is now shown and the Instance is in recently opened
    await screen.findByText("Title note", { selector: resourceHeaderSelector })
    await screen.findByText("BF Instance", { selector: openSelector })

    // Closing the shown resource reveals the other one
    fireEvent.click(screen.getAllByText("Close", { selector: "button" })[0])
    await screen.findByText("BF Instance", {
      selector: resourceHeaderSelector,
    })

    // Nothing else is open
    expect(
      screen.queryByText("Title note", { selector: openSelector }),
    ).not.toBeInTheDocument()

    // Closing the only shown resource will direct to the resource templates page
    fireEvent.click(screen.getAllByText("Close", { selector: "button" })[0])
    expect(
      await screen.findByText("Dashboard", {
        selector: "a",
      }),
    ).toHaveClass("active")
  }, 15000)
})
