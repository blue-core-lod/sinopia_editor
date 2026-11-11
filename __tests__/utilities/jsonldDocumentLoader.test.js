// Copyright 2026 Stanford University see LICENSE for license
import { datasetFromJsonld } from "utilities/Utilities"
import Config from "Config"
import rdf from "rdf-ext"
import bibframeContext from "../../static/contexts/bibframe-json-v0.1.json"

const BIBFRAME_CONTEXT_URL =
  "https://bibframe-json.org/v0.1/context/bibframe.jsonld"

const compactedWork = (context) => ({
  "@context": context,
  "@id": "http://localhost:3000/works/a",
  "@type": ["Work"],
  title: [{ "@type": ["Title"], mainTitle: ["Persuasion"] }],
})

// Saves global fetch in order to be restored after each test with mocked fetch
const originalFetch = global.fetch

describe("JSON-LD context loading", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"))
  })

  afterEach(() => {
    global.fetch = originalFetch
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

  it("fetches the API's own context from the API", async () => {
    const apiContextUrl = `${Config.sinopiaApiBase}/context.jsonld`
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(bibframeContext), {
        headers: { "Content-Type": "application/ld+json" },
      }),
    )

    const dataset = await datasetFromJsonld(compactedWork(apiContextUrl))

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch.mock.calls[0][0]).toBe(apiContextUrl)
    expect(dataset.size).toBe(4)
  })

  it("refuses a context from any other site and names its URL", async () => {
    await expect(
      datasetFromJsonld(compactedWork("https://example.com/context.jsonld")),
    ).rejects.toThrow(
      "Failed to load remote context https://example.com/context.jsonld: the editor only uses its bundled JSON-LD contexts and the API's own",
    )
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
