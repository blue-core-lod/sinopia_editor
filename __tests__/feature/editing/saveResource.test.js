import { renderApp, createHistory } from "testUtils"
import { fireEvent, waitFor, screen } from "@testing-library/react"
import * as sinopiaApi from "sinopiaApi"
import { featureSetup, resourceHeaderSelector } from "featureUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

featureSetup()

jest
  .spyOn(sinopiaApi, "postResource")
  .mockResolvedValue(
    "http://localhost:3000/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3f",
  )

describe("saving a resource", () => {
  describe("after opening a new resource", () => {
    const history = createHistory(["/editor/resourceTemplate:bf2:Title:Note"])
    renderApp(null, history)

    it("edits and saves", async () => {
      await screen.findAllByText("Title note", {
        selector: resourceHeaderSelector,
      })

      const saveBtn = screen.getAllByText("Save resource", {
        selector: "button",
      })[0] // there are multiple save buttons, grab the first

      const input = screen.getByPlaceholderText("Note Text")
      fireEvent.change(input, { target: { value: "foo" } })
      fireEvent.keyDown(input, { key: "Enter", code: 13, charCode: 13 })

      // There is foo text.
      await screen.findByText("foo", { selector: ".form-control" })

      // Check that the title of the document is set the same as the rdfs:label
      screen.getByText("foo", { selector: resourceHeaderSelector })

      expect(saveBtn).not.toBeDisabled()
      fireEvent.click(saveBtn)

      // The resource is saved without asking for a group and is assigned a URI
      await screen.findAllByText("URI:")
      screen.getAllByTestId("Copy URI to clipboard")

      // URL changes
      await waitFor(() =>
        expect(history.location.pathname).toEqual(
          "/editor/resource/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3f",
        ),
      )

      // Everything is owned by Blue Core
      const [, , group, editGroups] = sinopiaApi.postResource.mock.calls[0]
      expect(group).toEqual("blue core")
      expect(editGroups).toEqual(["blue core"])
      expect(screen.queryByText("Permissions")).not.toBeInTheDocument()
    }, 10000)
  })
})
