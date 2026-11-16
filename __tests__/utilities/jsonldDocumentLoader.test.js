// Copyright 2026 Stanford University see LICENSE for license
import { datasetFromJsonld, datasetFromRdf } from "utilities/Utilities"
import { fetchResource } from "sinopiaApi"
import rdf from "rdf-ext"
import bibframeContext from "../../static/contexts/bibframe-json-v0.1.json"

const BIBFRAME_CONTEXT_URL =
  "https://bibframe-json.org/v0.1/context/bibframe.jsonld"

const compactedWork = (context, id = "http://localhost:3000/works/a") => ({
  "@context": context,
  "@id": id,
  "@type": ["Work"],
  title: [{ "@type": ["Title"], mainTitle: ["Persuasion"] }],
})

const contextResponse = () =>
  new Response(JSON.stringify(bibframeContext), {
    headers: { "Content-Type": "application/ld+json" },
  })

// Saves global fetch in order to be restored after each test with mocked fetch
const originalFetch = global.fetch

describe("JSON-LD context loading", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"))
  })

  afterEach(() => {
    global.fetch = originalFetch
    window._env_ = {}
  })

  // https://github.com/blue-core-lod/sinopia_editor/issues/255
  it("expands the bibframe-json.org context from the bundled copy", async () => {
    const dataset = await datasetFromJsonld(compactedWork(BIBFRAME_CONTEXT_URL))

    expect(global.fetch).not.toHaveBeenCalled()
    expect(
      dataset.match(
        null,
        rdf.namedNode("http://id.loc.gov/ontologies/bibframe/mainTitle"),
      ).size,
    ).toBe(1)
  })

  // Load RDF accepts JSON-LD naming any context, as it did before bundling.
  it.each([
    ["an unbundled context host", "https://example.org/my-context.jsonld"],
    [
      "http:// form of the bundled context",
      "http://bibframe-json.org/v0.1/context/bibframe.jsonld",
    ],
    [
      "a newer bibframe-json version",
      "https://bibframe-json.org/v0.2/context/bibframe.jsonld",
    ],
  ])("fetches and parses JSON-LD using %s", async (_label, contextUrl) => {
    global.fetch = jest
      .fn()
      .mockImplementation(() => Promise.resolve(contextResponse()))

    const dataset = await datasetFromRdf(
      JSON.stringify(compactedWork(contextUrl)),
    )

    expect(global.fetch.mock.calls[0][0]).toBe(contextUrl)
    expect(dataset.size).toBe(4)
  })

  it("names the context URL when fetching it fails", async () => {
    await expect(
      datasetFromJsonld(compactedWork("https://example.com/context.jsonld")),
    ).rejects.toThrow(
      "Failed to load remote context https://example.com/context.jsonld: Failed to fetch",
    )
  })

  describe("the API's own context", () => {
    it("loads when SINOPIA_API_BASE_URL has a trailing slash", async () => {
      window._env_ = { SINOPIA_API_BASE_URL: "http://localhost:3000/" }
      global.fetch = jest
        .fn()
        .mockImplementation(() => Promise.resolve(contextResponse()))

      const dataset = await datasetFromRdf(
        JSON.stringify(compactedWork("http://localhost:3000/context.jsonld")),
      )

      expect(dataset.size).toBe(4)
    })

    it("loads a record through the documented proxy setup", async () => {
      window._env_ = { SINOPIA_API_BASE_URL: "http://localhost:8080" }
      const uri = "http://localhost:8080/works/a"
      global.fetch = jest.fn().mockImplementation((url) =>
        Promise.resolve(
          url.startsWith(uri)
            ? {
                ok: true,
                status: 200,
                json: () =>
                  Promise.resolve({
                    uri,
                    // The API behind the proxy names its own public host.
                    data: compactedWork(
                      "https://api.development.sinopia.io/context.jsonld",
                      uri,
                    ),
                  }),
              }
            : contextResponse(),
        ),
      )

      const [dataset] = await fetchResource(uri)

      expect(dataset.size).toBe(4)
    })
  })
})
