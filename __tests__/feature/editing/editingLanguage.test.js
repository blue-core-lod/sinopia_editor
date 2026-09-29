import { renderApp, createHistory } from "testUtils"
import { fireEvent, screen, within, waitFor } from "@testing-library/react"
import { featureSetup, resourceHeaderSelector } from "featureUtils"
import * as sinopiaApi from "sinopiaApi"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

featureSetup()

jest.spyOn(sinopiaApi, "detectLanguage").mockResolvedValue([])

describe("editing a language", () => {
  it("allows selecting a language", async () => {
    const history = createHistory(["/editor/resourceTemplate:testing:literal"])
    renderApp(null, history)

    await screen.findByText("Literal", {
      selector: resourceHeaderSelector,
    })

    // Add a value
    const input = screen.getByPlaceholderText("Literal input")
    fireEvent.change(input, { target: { value: "foo" } })
    fireEvent.keyDown(input, { key: "Enter", code: 13, charCode: 13 })

    // There is language button.
    const langBtn = screen.getByTestId("Change language for foo")
    expect(langBtn).toHaveTextContent("en")

    fireEvent.click(langBtn)
    // Using getByRole here and below because it limits to the visible modal.
    screen.getByRole("heading", { name: "Select language tag for foo" })

    const currentTagRow = screen.getByTestId("current tag row")
    within(currentTagRow).getByText("en")

    const newTagRow = screen.getByTestId("new tag row")
    within(newTagRow).getByText("en")

    const scriptInput = screen.getByTestId("scriptComponent-foo")
    // Select a script.
    fireEvent.click(scriptInput)
    fireEvent.change(scriptInput, { target: { value: "Latin (Latn)" } })
    fireEvent.click(
      screen.getByText("Latin (Latn)", { selector: ".rbt-highlight-text" })
    )
    within(newTagRow).getByText("en-Latn")

    // Clear script.
    fireEvent.click(screen.getByTestId("Clear script for foo"))
    within(newTagRow).getByText("en")

    const transliterationInput = screen.getByTestId(
      "transliterationComponent-foo"
    )

    // Select a transliteration
    fireEvent.click(transliterationInput)
    fireEvent.change(transliterationInput, {
      target: {
        value: "American Library Association-Library of Congress (alaloc)",
      },
    })
    fireEvent.click(
      screen.getByText(
        "American Library Association-Library of Congress (alaloc)",
        { selector: ".rbt-highlight-text" }
      )
    )
    within(newTagRow).getByText("en-t-en-m0-alaloc")

    // Clear transliteration
    fireEvent.click(screen.getByTestId("Clear transliteration for foo"))
    within(newTagRow).getByText("en")

    const langInput = screen.getByTestId("langComponent-foo")

    // Select a language
    fireEvent.click(langInput)
    fireEvent.change(langInput, { target: { value: "Tai (taw)" } })
    fireEvent.click(
      screen.getByText("Tai (taw)", { selector: ".rbt-highlight-text" })
    )
    within(newTagRow).getByText("taw")

    // Clear language
    fireEvent.click(screen.getByTestId("Clear language for foo"))
    within(newTagRow).getByText("None specified")
    expect(scriptInput).toBeDisabled()
    expect(transliterationInput).toBeDisabled()
  }, 15000)

  it("allows selecting a default language", async () => {
    const history = createHistory(["/editor/resourceTemplate:testing:inputs"])
    renderApp(null, history)

    await screen.findByText("Inputs", {
      selector: resourceHeaderSelector,
    })

    // Add a value
    const input = screen.getByPlaceholderText("Literal input")
    fireEvent.change(input, { target: { value: "foo" } })
    fireEvent.keyDown(input, { key: "Enter", code: 13, charCode: 13 })

    // There is language button.
    const langBtn = screen.getByTestId("Change language for foo")
    expect(langBtn).toHaveTextContent("en")

    fireEvent.click(langBtn)
    // Using getByRole here and below because it limits to the visible modal.
    screen.getByRole("heading", { name: "Select language tag for foo" })

    expect(
      screen.queryByText(/Make default for resource/)
    ).not.toBeInTheDocument()

    const langInput = screen.getByTestId("langComponent-foo")

    // Select a language
    fireEvent.click(langInput)
    fireEvent.change(langInput, { target: { value: "Tai (taw)" } })
    fireEvent.click(
      screen.getByText("Tai (taw)", { selector: ".rbt-highlight-text" })
    )

    fireEvent.click(screen.getByText(/Make default for resource/))
    fireEvent.click(screen.getByTestId("Select language for foo"))

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Select language tag for foo" })
      ).not.toBeInTheDocument()
    })

    // Changed for this input and other inputs
    expect(
      screen.getAllByText("Language: taw", { selector: "button" })
    ).toHaveLength(2)

    // Adding a new input also has default
    fireEvent.click(screen.getByTestId("Add Literal input"))
    await screen.findByText(/http:\/\/sinopia.io\/testing\/Inputs\/property4/)
    expect(
      screen.getAllByText("Language: taw", { selector: "button" })
    ).toHaveLength(3)
  }, 15000)

  // The InputLang modal is a singleton mounted once in Editor.jsx, so its local
  // state outlives any one opening. Opening it on an untagged value used to show
  // whichever language was selected for the previously opened value, and Submit
  // then applied that carried-over language.
  // See https://github.com/blue-core-lod/sinopia_editor/issues/191
  it("does not carry a language over between values", async () => {
    jest.spyOn(sinopiaApi, "detectLanguage").mockResolvedValue([])
    const history = createHistory(["/editor/resourceTemplate:testing:inputs"])
    renderApp(null, history)

    await screen.findByText("Inputs", {
      selector: resourceHeaderSelector,
    })

    // Two literal values, both defaulting to en.
    const input = screen.getByPlaceholderText("Literal input")
    fireEvent.change(input, { target: { value: "foo" } })
    fireEvent.keyDown(input, { key: "Enter", code: 13, charCode: 13 })

    fireEvent.click(screen.getByTestId("Add Literal input"))
    await waitFor(() =>
      expect(screen.getAllByPlaceholderText("Literal input")).toHaveLength(2)
    )
    const newInput = screen
      .getAllByPlaceholderText("Literal input")
      .find((elem) => elem.value === "")
    fireEvent.change(newInput, { target: { value: "bar" } })
    fireEvent.keyDown(newInput, { key: "Enter", code: 13, charCode: 13 })

    // Clear the language on bar.
    fireEvent.click(screen.getByTestId("Change language for bar"))
    fireEvent.click(screen.getByTestId("Clear language for bar"))
    fireEvent.click(screen.getByTestId("Select language for bar"))
    await waitFor(() =>
      expect(screen.getByTestId("Change language for bar")).toHaveTextContent(
        "No language specified"
      )
    )

    // Visit foo, which is still tagged en.
    fireEvent.click(screen.getByTestId("Change language for foo"))
    within(screen.getByTestId("new tag row")).getByText("en")
    fireEvent.click(screen.getByText("Cancel"))
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Select language tag for foo" })
      ).not.toBeInTheDocument()
    )

    // Back to bar: it has no language, so neither should the modal.
    fireEvent.click(screen.getByTestId("Change language for bar"))
    screen.getByRole("heading", { name: "Select language tag for bar" })
    within(screen.getByTestId("new tag row")).getByText("None specified")
  }, 15000)

  it("suggests a language", async () => {
    jest
      .spyOn(sinopiaApi, "detectLanguage")
      .mockResolvedValue([{ language: "zh-TW", score: 0.8 }])
    const history = createHistory(["/editor/resourceTemplate:testing:literal"])
    renderApp(null, history)

    await screen.findByText("Literal", {
      selector: resourceHeaderSelector,
    })

    // Add a value
    const input = screen.getByPlaceholderText("Literal input")
    fireEvent.change(input, {
      target: { value: "這是正確的事情，也是一種美味的方法。" },
    })
    fireEvent.keyDown(input, { key: "Enter", code: 13, charCode: 13 })

    // There is language button.
    const langBtn = screen.getByTestId(
      "Change language for 這是正確的事情，也是一種美味的方法。"
    )
    expect(langBtn).toHaveTextContent("en")

    fireEvent.click(langBtn)
    // Using getByRole here and below because it limits to the visible modal.
    screen.getByRole("heading", {
      name: "Select language tag for 這是正確的事情，也是一種美味的方法。",
    })

    const newTagRow = screen.getByTestId("new tag row")
    within(newTagRow).getByText("en")

    // Language selection
    await screen.findByText(/Detected Chinese \(zh\)/)

    fireEvent.click(screen.getByText("Click to use."))

    await within(newTagRow).findByText("zh")

    expect(
      screen.queryByText(/Detected Chinese \(zh\)/)
    ).not.toBeInTheDocument()
  }, 15000)
})
