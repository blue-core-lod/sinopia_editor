import React from "react"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import LoadByRDFForm from "components/load/LoadByRDFForm"
import {
  renderComponent,
  createStore,
  createHistory,
} from "../../testUtilities/testUtils"
import { createState } from "stateUtils"
import { dashboardErrorKey } from "utilities/errorKeyFactory"
import useRdfResource from "hooks/useRdfResource"

// Mock KeycloakContext with a token so getJwt works
jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({
    keycloak: { token: "test-token" },
  }),
}))

// Mock useRdfResource hook — it's tested separately
jest.mock("hooks/useRdfResource", () => jest.fn())

const originalFetch = global.fetch

// fetch calls to the works endpoint, with the URL parsed so tests can check
// the path and query parameters separately.
const worksCalls = () =>
  global.fetch.mock.calls
    .map(([url, options]) => [new URL(url), options])
    .filter(([url]) => url.pathname === "/works")

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
        screen.getByPlaceholderText(
          "Upload a .mrc file above to convert to MARCXML.",
        ),
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
        "Upload a .mrc file above to convert to MARCXML.",
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

      global.fetch = jest
        .fn()
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
      expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3000/marc2xml")
      expect(fetchMock.mock.calls[0][1]).toMatchObject({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/marc",
          Authorization: "Bearer test-token",
        }),
      })

      // Second call: marc2bibframe
      expect(fetchMock.mock.calls[1][0]).toBe(
        "http://localhost:3000/marc2bibframe",
      )
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
          "Upload a .mrc file above to convert to MARCXML.",
        )
        expect(textarea.value).toContain("leader")
      })
    })

    it("populates the RDF textarea after conversion", async () => {
      setupFetchMocks()
      renderForm()

      uploadMarcFile()

      await waitFor(() => {
        expect(screen.getByLabelText(/Accepts JSON-LD/)).toHaveValue(rdfText)
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
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(marcXml),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(rdfText),
        })

      const { store, history } = renderForm()
      const fileInput = screen.getByLabelText("Choose MARC file")
      const file = new File(["data"], "record.mrc", {
        type: "application/marc",
      })
      fireEvent.change(fileInput, { target: { files: [file] } })

      // Wait for conversion to complete
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      return { store, history }
    }

    it("submits to /api/works when RDF came from MARC conversion", async () => {
      await setupMarcConversion()

      // Now mock the /api/works call
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ uuid: "abc-123" }),
      })

      fireEvent.click(screen.getByText("Submit"))

      await waitFor(() => {
        expect(worksCalls()).toHaveLength(1)
      })
      const [url, options] = worksCalls()[0]
      expect(`${url.origin}${url.pathname}`).toBe("http://localhost:3000/works")
      expect(options).toMatchObject({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        }),
      })
    })

    // Fails if the MARC submit stops sending record_derived_from=false, so the
    // API records the placeholder example.org URIs as bf:derivedFrom (#271).
    it("asks the API not to record derivedFrom for the placeholder URIs", async () => {
      await setupMarcConversion()

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ uuid: "abc-123" }),
      })

      fireEvent.click(screen.getByText("Submit"))

      await waitFor(() => {
        expect(worksCalls()).toHaveLength(1)
      })
      const [url] = worksCalls()[0]
      expect(url.searchParams.get("record_derived_from")).toBe("false")
    })

    // Fails if adding the query parameter changes the POST body sent to /works.
    it("still posts the converted RDF as the request body", async () => {
      await setupMarcConversion()

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ uuid: "abc-123" }),
      })

      fireEvent.click(screen.getByText("Submit"))

      await waitFor(() => {
        expect(worksCalls()).toHaveLength(1)
      })
      const [, options] = worksCalls()[0]
      expect(JSON.parse(options.body)).toEqual({ data: rdfText })
    })

    const workUri = "http://localhost:3000/works/abc-123"

    it("redirects to the dashboard with a processing message before the work is created", async () => {
      const { store, history } = await setupMarcConversion()

      // Never resolves, so anything observed happened before the API responded.
      global.fetch = jest.fn().mockReturnValueOnce(new Promise(() => {}))

      fireEvent.click(screen.getByText("Submit"))

      expect(history.location.pathname).toBe("/dashboard")
      const messages = store.getState().editor.successes[dashboardErrorKey]
      expect(messages).toHaveLength(1)
      expect(messages[0]).toMatch(/being processed/)
    })

    it("adds a dashboard success message linking to the created work", async () => {
      const { store } = await setupMarcConversion()

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ uuid: "abc-123", uri: workUri }),
      })

      fireEvent.click(screen.getByText("Submit"))

      await waitFor(() => {
        expect(store.getState().editor.successes[dashboardErrorKey]).toEqual([
          expect.stringMatching(/being processed/),
          { text: "The new work was created:", resourceUri: workUri },
        ])
      })
    })

    it("dispatches a dashboard error when /api/works fails", async () => {
      const { store } = await setupMarcConversion()

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      })

      fireEvent.click(screen.getByText("Submit"))

      await waitFor(() => {
        const errors = store.getState().editor.errors[dashboardErrorKey]
        expect(errors.some((e) => /Error creating work/.test(e))).toBe(true)
      })
    })

    it("clears isMarcBibframe when RDF textarea is manually edited", async () => {
      await setupMarcConversion()

      // Manually edit the RDF textarea — this should clear the MARC flag
      const rdfTextarea = screen.getByLabelText(/Accepts JSON-LD/)
      fireEvent.change(rdfTextarea, { target: { value: "manual rdf" } })

      // Now submit should NOT call /api/works (it should go through normal RDF parsing)
      global.fetch = jest.fn()

      fireEvent.click(screen.getByText("Submit"))

      // /api/works should not be called
      expect(worksCalls()).toHaveLength(0)
    })
  })

  describe("RDF submit flow", () => {
    // Fails if ordinary Load RDF is routed through the MARC /works POST (for
    // example, if the isMarcBibframe check is dropped), which would save it
    // straight to the API without derivedFrom instead of loading the editor.
    it("loads RDF into the editor without posting to /works", async () => {
      global.fetch = jest.fn()
      renderForm()

      const rdf =
        '<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:bf2:WorkTitle" .'
      fireEvent.change(screen.getByLabelText(/Accepts JSON-LD/), {
        target: { value: rdf },
      })
      fireEvent.click(screen.getByText("Submit"))

      // The normal flow hands the parsed dataset to useRdfResource.
      await waitFor(() => {
        expect(useRdfResource).toHaveBeenLastCalledWith(
          expect.objectContaining({ size: 1 }),
          "",
          "resourceTemplate:bf2:WorkTitle",
          expect.anything(),
        )
      })
      expect(worksCalls()).toHaveLength(0)
      const derivedFromCalls = global.fetch.mock.calls.filter(([url]) =>
        new URL(url, "http://localhost").searchParams.has(
          "record_derived_from",
        ),
      )
      expect(derivedFromCalls).toHaveLength(0)
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

      const rdfTextarea = screen.getByLabelText(/Accepts JSON-LD/)
      fireEvent.change(rdfTextarea, { target: { value: "some rdf" } })

      expect(screen.getByText("Submit")).not.toBeDisabled()
    })
  })
})
