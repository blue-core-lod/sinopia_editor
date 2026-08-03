import React from "react"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import LoadByRDFForm from "components/load/LoadByRDFForm"
import { renderComponent, createStore, createHistory } from "../../../__tests__/testUtilities/testUtils"
import { createState } from "stateUtils"

// Mock KeycloakContext with a token so getJwt works
jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({
    keycloak: { token: "test-token" },
  }),
}))

// Mock useRdfResource hook — it's tested separately
jest.mock("hooks/useRdfResource", () => jest.fn())

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
  jest.restoreAllMocks()
})

const renderForm = () => {
  const store = createStore(createState())
  const history = createHistory()
  renderComponent(<LoadByRDFForm />, store, history)
  return { store, history }
}

describe("LoadByRDFForm", () => {
  describe("MARC section rendering", () => {
    it("renders the MARC upload section", () => {
      renderForm()

      expect(screen.getByText("Load MARC into Editor")).toBeInTheDocument()
      expect(screen.getByText("Choose MARC file")).toBeInTheDocument()
      expect(screen.getByText("MARCXML output")).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText("Upload a .mrc file above to convert to MARCXML.")
      ).toBeInTheDocument()
    })

    it("renders a file input that accepts .mrc files", () => {
      renderForm()

      const fileInput = screen.getByLabelText("Choose MARC file")
      expect(fileInput).toHaveAttribute("type", "file")
      expect(fileInput).toHaveAttribute("accept", ".mrc")
    })

    it("renders the MARCXML textarea as disabled when not converting", () => {
      renderForm()

      const textarea = screen.getByPlaceholderText(
        "Upload a .mrc file above to convert to MARCXML."
      )
      expect(textarea).not.toBeDisabled()
    })
  })

  describe("MARC file upload and conversion", () => {
    const marcXml = "<record><leader>00000cam a2200000 a 4500</leader></record>"
    const rdfText = "<rdf:RDF>some bibframe</rdf:RDF>"

    const setupFetchMocks = (overrides = {}) => {
      const marc2xmlResp = overrides.marc2xmlResp || {
        ok: true,
        text: jest.fn().mockResolvedValue(marcXml),
      }
      const marc2bibframeResp = overrides.marc2bibframeResp || {
        ok: true,
        text: jest.fn().mockResolvedValue(rdfText),
      }

      global.fetch = jest.fn()
        .mockResolvedValueOnce(marc2xmlResp)
        .mockResolvedValueOnce(marc2bibframeResp)

      return global.fetch
    }

    const uploadMarcFile = () => {
      const fileInput = screen.getByLabelText("Choose MARC file")
      const file = new File(["marc-binary-data"], "record.mrc", {
        type: "application/marc",
      })
      fireEvent.change(fileInput, { target: { files: [file] } })
    }

    it("calls marc2xml and marc2bibframe APIs on file upload", async () => {
      const fetchMock = setupFetchMocks()
      renderForm()

      uploadMarcFile()

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2)
      })

      // First call: marc2xml
      expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3000/api/marc2xml")
      expect(fetchMock.mock.calls[0][1]).toMatchObject({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/marc",
          Authorization: "Bearer test-token",
        }),
      })

      // Second call: marc2bibframe
      expect(fetchMock.mock.calls[1][0]).toBe("http://localhost:3000/api/marc2bibframe")
      expect(fetchMock.mock.calls[1][1]).toMatchObject({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/xml",
          Authorization: "Bearer test-token",
        }),
      })
    })

    it("populates the MARCXML textarea after conversion", async () => {
      setupFetchMocks()
      renderForm()

      uploadMarcFile()

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(
          "Upload a .mrc file above to convert to MARCXML."
        )
        expect(textarea.value).toContain("leader")
      })
    })

    it("populates the RDF textarea after conversion", async () => {
      setupFetchMocks()
      renderForm()

      uploadMarcFile()

      await waitFor(() => {
        const rdfTextarea = document.getElementById("resourceTextArea")
        expect(rdfTextarea.value).toBe(rdfText)
      })
    })

    it("dispatches an error when marc2xml fails", async () => {
      setupFetchMocks({
        marc2xmlResp: {
          ok: false,
          statusText: "Internal Server Error",
        },
      })
      const { store } = renderForm()

      uploadMarcFile()

      await waitFor(() => {
        const actions = store.getActions ? store.getActions() : []
        const state = store.getState()
        const errors = Object.values(state.editor.errors).flat()
        expect(errors.some((e) => /marc2xml/.test(e))).toBe(true)
      })
    })

    it("dispatches an error when marc2bibframe fails", async () => {
      setupFetchMocks({
        marc2bibframeResp: {
          ok: false,
          statusText: "Bad Request",
        },
      })
      const { store } = renderForm()

      uploadMarcFile()

      await waitFor(() => {
        const state = store.getState()
        const errors = Object.values(state.editor.errors).flat()
        expect(errors.some((e) => /marc2bibframe/.test(e))).toBe(true)
      })
    })

    it("does nothing when no file is selected", () => {
      global.fetch = jest.fn()
      renderForm()

      const fileInput = screen.getByLabelText("Choose MARC file")
      fireEvent.change(fileInput, { target: { files: [] } })

      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe("MARC BIBFRAME submit flow", () => {
    const marcXml = "<record><leader>test</leader></record>"
    const rdfText = "<rdf:RDF>bibframe rdf</rdf:RDF>"

    const setupMarcConversion = async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(marcXml),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(rdfText),
        })

      const result = renderForm()
      const fileInput = screen.getByLabelText("Choose MARC file")
      const file = new File(["data"], "record.mrc", {
        type: "application/marc",
      })
      fireEvent.change(fileInput, { target: { files: [file] } })

      // Wait for conversion to complete
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      return result
    }

    it("submits to /api/works when RDF came from MARC conversion", async () => {
      const { history } = await setupMarcConversion()

      // Now mock the /api/works call
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ uuid: "abc-123" }),
      })

      fireEvent.click(screen.getByText("Submit"))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:3000/api/works",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Authorization: "Bearer test-token",
            }),
          })
        )
      })

      await waitFor(() => {
        expect(history.location.pathname).toBe("/editor/abc-123")
      })
    })

    it("dispatches an error when /api/works fails", async () => {
      const { store } = await setupMarcConversion()

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      })

      fireEvent.click(screen.getByText("Submit"))

      await waitFor(() => {
        const state = store.getState()
        const errors = Object.values(state.editor.errors).flat()
        expect(errors.some((e) => /Error creating work/.test(e))).toBe(true)
      })
    })

    it("clears isMarcBibframe when RDF textarea is manually edited", async () => {
      await setupMarcConversion()

      // Manually edit the RDF textarea — this should clear the MARC flag
      const rdfTextarea = document.getElementById("resourceTextArea")
      fireEvent.change(rdfTextarea, { target: { value: "manual rdf" } })

      // Now submit should NOT call /api/works (it should go through normal RDF parsing)
      global.fetch = jest.fn()

      fireEvent.click(screen.getByText("Submit"))

      // /api/works should not be called
      expect(global.fetch).not.toHaveBeenCalledWith(
        "http://localhost:3000/api/works",
        expect.anything()
      )
    })
  })

  describe("RDF section rendering", () => {
    it("renders the RDF form section", () => {
      renderForm()

      expect(screen.getByText("Load RDF into Editor")).toBeInTheDocument()
      expect(screen.getByText("Submit")).toBeInTheDocument()
    })

    it("disables the submit button when RDF is empty", () => {
      renderForm()

      expect(screen.getByText("Submit")).toBeDisabled()
    })

    it("enables the submit button when RDF is entered", () => {
      renderForm()

      const rdfTextarea = document.getElementById("resourceTextArea")
      fireEvent.change(rdfTextarea, { target: { value: "some rdf" } })

      expect(screen.getByText("Submit")).not.toBeDisabled()
    })
  })
})
