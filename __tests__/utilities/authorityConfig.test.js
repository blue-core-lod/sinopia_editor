import authorityConfig from "../../static/authorityConfig.json"

// LocSuggestLookup reads rdftype and memberOf from this file, not from the
// template, so an entry with neither can only ever return an error.
const locSuggestEntries = authorityConfig.filter((entry) =>
  entry.uri.startsWith("urn:ld4p:locsuggest"),
)

describe("authorityConfig.json", () => {
  it("has LOC Suggest entries", () => {
    expect(locSuggestEntries.length).toBeGreaterThan(0)
  })

  it.each(locSuggestEntries.map((entry) => [entry.uri, entry]))(
    "%s has an rdftype or a memberOf",
    (_uri, entry) => {
      expect(entry.rdftype || entry.memberOf).toBeTruthy()
    },
  )
})
