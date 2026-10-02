import { renderApp, createHistory } from "testUtils"
import { fireEvent, screen } from "@testing-library/react"
import * as sinopiaApi from "sinopiaApi"
import { featureSetup, resourceHeaderSelector } from "featureUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

featureSetup()

describe("requesting MARC", () => {
  const marcJobUrl = "http://fake/job"
  const marcUrl = "http://fake/marc"
  const marc = "fake marc"

  describe("when processing occurs without error", () => {
    const history = createHistory([
      "/editor/resource/resource/a5c5f4c0-e7cd-4ca5-a20f-2a37fe1080d5",
    ])

    beforeEach(() => {
      jest.spyOn(sinopiaApi, "postMarc").mockResolvedValue(marcJobUrl)
      jest.spyOn(sinopiaApi, "getMarcJob").mockResolvedValue([marcUrl, marc])
    })

    it("retrieves the MARC", async () => {
      renderApp(null, history)

      await screen.findByText("Instance1", { selector: resourceHeaderSelector })

      fireEvent.click(await screen.findByText("MARC"))
      fireEvent.click(await screen.findByText("Request conversion to MARC"))

      await screen.findByText(/Requesting MARC/)

      /*
       * MarcButton schedules marcJobTimer with a 1000ms setTimeout, and until it
       * fires the button reads "Requesting MARC" — which findByText("MARC") does
       * not match, since matching is exact by default. RTL's default query
       * timeout is also 1000ms, so the two race and this test has been
       * intermittently failing. Wait past the production timer explicitly.
       */
      fireEvent.click(await screen.findByText("MARC", {}, { timeout: 5000 }))
      fireEvent.click(await screen.findByText("View MARC"))

      // Modal opens.
      await screen.findByText(marc)
      await screen.findByText(/Copy MARC/, { selector: "button" })
    })
  })

  describe("when processing occurs with an error", () => {
    const history = createHistory([
      "/editor/resource/resource/a5c5f4c0-e7cd-4ca5-a20f-2a37fe1080d5",
    ])

    beforeEach(() => {
      jest.spyOn(sinopiaApi, "postMarc").mockRejectedValue("Ooops")
    })

    it("displays the alert", async () => {
      renderApp(null, history)

      await screen.findByText("Instance1", { selector: resourceHeaderSelector })

      fireEvent.click(await screen.findByText("MARC"))
      fireEvent.click(await screen.findByText("Request conversion to MARC"))

      await screen.findByText(/Error requesting MARC: Ooops/)
    })
  })
})
