import { renderApp, createHistory } from "testUtils"
import { screen } from "@testing-library/react"
import { featureSetup, resourceHeaderSelector } from "featureUtils"
import * as sinopiaApi from "sinopiaApi"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

featureSetup()

jest.spyOn(sinopiaApi, "detectLanguage").mockResolvedValue([])

// Resources ingested from LC arrive with untagged literals. Catalogers should
// not have to open the language modal on every value to tag them. See
// https://github.com/blue-core-lod/sinopia_editor/issues/191
describe("loading a resource with untagged literals", () => {
  it("applies the default language to untagged values", async () => {
    const history = createHistory([
      "/editor/resource/resource/e1f2a3b4-5c6d-4e7f-8a9b-0c1d2e3f4a5b",
    ])
    renderApp(null, history)

    await screen.findByText("Inputs", { selector: resourceHeaderSelector })

    // Literal value.
    expect(
      await screen.findByTestId("Change language for An untagged literal value")
    ).toHaveTextContent("Language: en")

    // URI value, tagged from its untagged rdfs:label.
    expect(
      screen.getByTestId("Change language for Print version")
    ).toHaveTextContent("Language: en")

    // Lookup value.
    expect(
      screen.getByTestId("Change language for corn sheller")
    ).toHaveTextContent("Language: en")

    // Value in a nested resource.
    expect(
      screen.getByTestId("Change language for An untagged nested resource")
    ).toHaveTextContent("Language: en")
  }, 20000)

  it("does not dirty the resource", async () => {
    const history = createHistory([
      "/editor/resource/resource/e1f2a3b4-5c6d-4e7f-8a9b-0c1d2e3f4a5b",
    ])
    renderApp(null, history)

    await screen.findByText("Inputs", { selector: resourceHeaderSelector })
    await screen.findByTestId("Change language for An untagged literal value")

    screen
      .getAllByRole("button", { name: "Save" })
      .forEach((btn) => expect(btn).toBeDisabled())
  }, 20000)

  it("leaves language-suppressed properties untagged", async () => {
    const history = createHistory([
      "/editor/resource/resource/f2a3b4c5-6d7e-4f8a-9b0c-1d2e3f4a5b6c",
    ])
    renderApp(null, history)

    await screen.findByText("Suppress language", {
      selector: resourceHeaderSelector,
    })
    await screen.findByDisplayValue("A suppressed literal value")

    // No language button at all when the property suppresses language and the
    // value carries no tag of its own.
    expect(
      screen.queryByTestId("Change language for A suppressed literal value")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId("Change language for Print version")
    ).not.toBeInTheDocument()
  }, 20000)

  it("leaves typed literals untagged", async () => {
    const history = createHistory([
      "/editor/resource/resource/a3b4c5d6-7e8f-4a9b-8c0d-2e3f4a5b6c7d",
    ])
    renderApp(null, history)

    await screen.findByText("Literal", { selector: resourceHeaderSelector })
    await screen.findByDisplayValue("2020-01-01")

    // RDF forbids a language tag on a typed literal.
    expect(
      screen.getByTestId("Change language for 2020-01-01")
    ).toHaveTextContent("No language specified")
  }, 20000)
})
