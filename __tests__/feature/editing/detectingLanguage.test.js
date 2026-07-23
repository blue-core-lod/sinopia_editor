import { renderApp, createHistory } from "testUtils"
import { fireEvent, screen } from "@testing-library/react"
import { featureSetup, resourceHeaderSelector } from "featureUtils"
import Config from "Config"

// A realistic, non-empty keycloak object, unlike the top-level mock used by
// editingLanguage.test.js. This lets the real getJwt(keycloak) code path in
// sinopiaApi.detectLanguage run, which editingLanguage.test.js mocks away
// entirely and so cannot catch a regression there.
jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({
    keycloak: { token: "Secret-Token" },
  }),
}))

featureSetup()

describe("clicking the language link", () => {
  it("opens the language modal with a populated language list, without crashing", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: [{ language: "en", score: 0.99 }],
      }),
    })

    const history = createHistory(["/editor/resourceTemplate:testing:literal"])
    renderApp(null, history)

    await screen.findByText("Literal", {
      selector: resourceHeaderSelector,
    })

    // The resource template has now loaded via fixtures. Switch fixtures off
    // so detectLanguage takes its real getJwt/fetch path below instead of its
    // fixture shortcut, which never touches keycloak at all.
    jest
      .spyOn(Config, "useResourceTemplateFixtures", "get")
      .mockReturnValue(false)

    // Add a value
    const input = screen.getByPlaceholderText("Literal input")
    fireEvent.change(input, { target: { value: "foo" } })
    fireEvent.keyDown(input, { key: "Enter", code: 13, charCode: 13 })

    // Click the language link, which triggers detectLanguage(text, keycloak)
    // for real. If keycloak isn't passed through from InputLang.jsx, getJwt
    // throws and the modal never appears.
    const langBtn = screen.getByTestId("Change language for foo")
    fireEvent.click(langBtn)

    screen.getByRole("heading", { name: "Select language tag for foo" })

    // The resource's default language ("en") is preselected, so clear it
    // first to see the full, unfiltered language list.
    fireEvent.click(screen.getByTestId("Clear language for foo"))

    const langInput = screen.getByTestId("langComponent-foo")
    fireEvent.click(langInput)

    await screen.findByText("English (en)")
    screen.getByText("Tai (taw)")

    // Confirms the real detectLanguage/getJwt path ran end-to-end.
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/helpers/langDetection"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer Secret-Token",
        }),
      })
    )
  }, 15000)
})
