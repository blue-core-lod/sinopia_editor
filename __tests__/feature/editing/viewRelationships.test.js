import { renderApp, createHistory } from "testUtils"
import { fireEvent, screen } from "@testing-library/react"
import { featureSetup, resourceHeaderSelector } from "featureUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

featureSetup()

describe("relationships", () => {
  describe("when a resource has relationships", () => {
    // instance_with_refs.json has bf:instanceOf pointing to a Work (work_with_refs.json)
    const history = createHistory([
      "/editor/resource/a5c5f4c0-e7cd-4ca5-a20f-2a37fe1080d5",
    ])

    it("lists the relationships", async () => {
      renderApp(null, history)

      await screen.findByText("Instance1", { selector: resourceHeaderSelector })

      fireEvent.click(screen.getByText("Relationships"))

      await screen.findByText("Works", { selector: "h5" })
      screen.getByText("Work1", { selector: "li", exact: false })
    })
  })

  describe("when a resource has no relationships", () => {
    const history = createHistory([
      "/editor/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3f",
    ])

    it("lists versions, previews versions, and displays diffs", async () => {
      renderApp(null, history)

      await screen.findByText("Example Label", {
        selector: resourceHeaderSelector,
      })

      // No relationships pill
      expect(screen.queryByText("Relationships")).not.toBeInTheDocument()
    }, 10000)
  })
})
