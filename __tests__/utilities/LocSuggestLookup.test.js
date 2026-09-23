import getLocSuggestLookupResult from "utilities/LocSuggestLookup"
import suggest from "utilities/LocSuggest"

jest.mock("utilities/LocSuggest")

// Shaped after a real suggest2 hit. `more` keys are omitted by the service when
// they have no values, so most of them are absent here on purpose.
const hit = {
  suggestLabel: "Dress accessories",
  aLabel: "Dress accessories",
  uri: "http://id.loc.gov/authorities/subjects/sh85039509",
  token: "sh85039509",
  more: {
    rdftypes: ["Topic", "SimpleType", "Authority"],
    variantLabels: ["Accessories (Dress)", "Costume accessories"],
    sources: ["found : Work cat.: 92063102"],
    broaders: ["Clothing and dress"],
    lcclasses: [
      {
        classuri: "http://id.loc.gov/authorities/classification/TT649.8-TT668",
        code: "TT649.8-TT668",
        label: "Clothing manufacture",
      },
    ],
  },
}

const simpleConfig = { uri: "urn:ld4p:locsuggest:subjects:simple" }

const contextValues = (result, property) =>
  result.results[0].context.find((entry) => entry.property === property)?.values

describe("getLocSuggestLookupResult()", () => {
  // resetMocks is false repo-wide, so call counts would otherwise accumulate.
  beforeEach(() => jest.clearAllMocks())

  it("passes the configured rdftype and offset to the suggest service", async () => {
    suggest.mockResolvedValue({ count: 1, hits: [hit] })

    await getLocSuggestLookupResult("dress", simpleConfig, {
      startOfRange: 25,
    })

    expect(suggest).toHaveBeenCalledWith("dress", "SimpleType", 25)
  })

  it("reads the rdftype from authorityConfig.json, not the passed object", async () => {
    suggest.mockResolvedValue({ count: 1, hits: [hit] })

    await getLocSuggestLookupResult(
      "20th",
      { uri: "urn:ld4p:locsuggest:subjects:temporal" },
      { startOfRange: 0 }
    )

    expect(suggest).toHaveBeenCalledWith("20th", "Temporal", 0)
  })

  it("adapts hits to the shape LookupTab expects", async () => {
    suggest.mockResolvedValue({ count: 1, hits: [hit] })

    const result = await getLocSuggestLookupResult("dress", simpleConfig, {
      startOfRange: 0,
    })

    expect(result.results).toHaveLength(1)
    expect(result.results[0]).toEqual(
      expect.objectContaining({
        uri: "http://id.loc.gov/authorities/subjects/sh85039509",
        id: "sh85039509",
        label: "Dress accessories",
      })
    )
  })

  it("reports total matches from count, not the page length", async () => {
    suggest.mockResolvedValue({ count: 59, pagesize: 1, hits: [hit] })

    const result = await getLocSuggestLookupResult("management", simpleConfig, {
      startOfRange: 0,
    })

    expect(result.totalHits).toEqual(59)
  })

  it("leads the context with the identifier", async () => {
    suggest.mockResolvedValue({ count: 1, hits: [hit] })

    const result = await getLocSuggestLookupResult("dress", simpleConfig, {
      startOfRange: 0,
    })

    // Distinct headings routinely share a label, so the id has to be visible.
    expect(result.results[0].context[0]).toEqual({
      property: "ID",
      values: ["http://id.loc.gov/authorities/subjects/sh85039509"],
    })
  })

  it("carries the detail fields through from more", async () => {
    suggest.mockResolvedValue({ count: 1, hits: [hit] })

    const result = await getLocSuggestLookupResult("dress", simpleConfig, {
      startOfRange: 0,
    })

    expect(contextValues(result, "Variant label")).toEqual([
      "Accessories (Dress)",
      "Costume accessories",
    ])
    expect(contextValues(result, "Broader")).toEqual(["Clothing and dress"])
    expect(contextValues(result, "Source")).toEqual([
      "found : Work cat.: 92063102",
    ])
  })

  it("flattens lcclasses objects to code and label", async () => {
    suggest.mockResolvedValue({ count: 1, hits: [hit] })

    const result = await getLocSuggestLookupResult("dress", simpleConfig, {
      startOfRange: 0,
    })

    expect(contextValues(result, "LC classification")).toEqual([
      "TT649.8-TT668 — Clothing manufacture",
    ])
  })

  it("omits context entries the service did not return", async () => {
    suggest.mockResolvedValue({ count: 1, hits: [hit] })

    const result = await getLocSuggestLookupResult("dress", simpleConfig, {
      startOfRange: 0,
    })

    const properties = result.results[0].context.map((e) => e.property)
    expect(properties).not.toContain("Note")
    expect(properties).not.toContain("Related")
  })

  it("skips hits with no label or no uri", async () => {
    suggest.mockResolvedValue({
      count: 3,
      hits: [hit, { uri: "http://example.com/x" }, { aLabel: "No uri" }],
    })

    const result = await getLocSuggestLookupResult("dress", simpleConfig, {
      startOfRange: 0,
    })

    expect(result.results).toHaveLength(1)
  })

  it("returns an error when the authority has no configured rdftype", async () => {
    const result = await getLocSuggestLookupResult(
      "dress",
      { uri: "urn:ld4p:locsuggest:subjects:nonesuch" },
      { startOfRange: 0 }
    )

    expect(result.error).toMatch("No rdftype configured")
    expect(suggest).not.toHaveBeenCalled()
  })

  it("returns an error rather than throwing when the service fails", async () => {
    suggest.mockRejectedValue(new Error("Service Unavailable"))

    const result = await getLocSuggestLookupResult("dress", simpleConfig, {
      startOfRange: 0,
    })

    expect(result.error).toEqual("Service Unavailable")
  })

  it("handles a response with no hits", async () => {
    suggest.mockResolvedValue({ count: 0 })

    const result = await getLocSuggestLookupResult("zzzz", simpleConfig, {
      startOfRange: 0,
    })

    expect(result.results).toEqual([])
    expect(result.totalHits).toEqual(0)
  })
})
