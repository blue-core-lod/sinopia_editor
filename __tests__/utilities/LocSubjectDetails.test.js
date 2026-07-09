import fetchSubjectDetails from "utilities/LocSubjectDetails"

const SIMPLE_RDF = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:madsrdf="http://www.loc.gov/mads/rdf/v1#"
  xmlns:skos="http://www.w3.org/2004/02/skos/core#"
>
  <madsrdf:Topic rdf:about="http://id.loc.gov/authorities/subjects/sh85105062">
    <madsrdf:authoritativeLabel>Potatoes</madsrdf:authoritativeLabel>
    <skos:prefLabel>Potatoes</skos:prefLabel>
    <madsrdf:note>Includes works on the potato plant and its uses.</madsrdf:note>
  </madsrdf:Topic>
</rdf:RDF>`

const NESTED_RDF = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:madsrdf="http://www.loc.gov/mads/rdf/v1#"
  xmlns:skos="http://www.w3.org/2004/02/skos/core#"
>
  <madsrdf:ComplexSubject rdf:about="http://id.loc.gov/authorities/subjects/sh2008110277">
    <madsrdf:authoritativeLabel>Puppets--Political aspects</madsrdf:authoritativeLabel>
    <madsrdf:componentList>
      <rdf:Description>
        <rdf:first rdf:resource="http://id.loc.gov/authorities/subjects/sh85105062"/>
      </rdf:Description>
    </madsrdf:componentList>
  </madsrdf:ComplexSubject>
</rdf:RDF>`

const MULTIPLE_LABELS_RDF = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:madsrdf="http://www.loc.gov/mads/rdf/v1#"
>
  <madsrdf:Topic rdf:about="http://id.loc.gov/authorities/subjects/sh85105062">
    <madsrdf:variantLabel>Potato</madsrdf:variantLabel>
    <madsrdf:variantLabel>Irish potato</madsrdf:variantLabel>
    <madsrdf:authoritativeLabel>Potatoes</madsrdf:authoritativeLabel>
  </madsrdf:Topic>
</rdf:RDF>`

const MULTIPLE_RESOURCES_RDF = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:madsrdf="http://www.loc.gov/mads/rdf/v1#"
>
  <madsrdf:Topic rdf:about="http://id.loc.gov/authorities/subjects/sh85105062">
    <madsrdf:authoritativeLabel>Potatoes</madsrdf:authoritativeLabel>
  </madsrdf:Topic>
  <madsrdf:Topic rdf:about="http://id.loc.gov/authorities/subjects/sh85105063">
    <madsrdf:authoritativeLabel>Potato chips</madsrdf:authoritativeLabel>
  </madsrdf:Topic>
</rdf:RDF>`

const mockRdfResponse = (xmlText) =>
  jest.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(xmlText),
  })

describe("fetchSubjectDetails()", () => {
  it("fetches the correct URL", async () => {
    global.fetch = mockRdfResponse(SIMPLE_RDF)

    await fetchSubjectDetails("sh85105062")

    expect(global.fetch).toHaveBeenCalledWith(
      "https://id.loc.gov/authorities/subjects/sh85105062.rdf"
    )
  })

  it("strips namespace prefixes from element and attribute names", async () => {
    global.fetch = mockRdfResponse(SIMPLE_RDF)

    const result = await fetchSubjectDetails("sh85105062")

    expect(result.type).toBe("Topic")
    expect(result.about).toBe(
      "http://id.loc.gov/authorities/subjects/sh85105062"
    )
    expect(result.authoritativeLabel).toBe("Potatoes")
    expect(result.prefLabel).toBe("Potatoes")
    expect(result.note).toBe("Includes works on the potato plant and its uses.")
  })

  it("collects repeated sibling elements into an array", async () => {
    global.fetch = mockRdfResponse(MULTIPLE_LABELS_RDF)

    const result = await fetchSubjectDetails("sh85105062")

    expect(result.variantLabel).toEqual(["Potato", "Irish potato"])
    expect(result.authoritativeLabel).toBe("Potatoes")
  })

  it("preserves hierarchy for nested elements", async () => {
    global.fetch = mockRdfResponse(NESTED_RDF)

    const result = await fetchSubjectDetails("sh2008110277")

    expect(result.type).toBe("ComplexSubject")
    expect(result.authoritativeLabel).toBe("Puppets--Political aspects")
    expect(result.componentList).toEqual({
      Description: {
        first: { resource: "http://id.loc.gov/authorities/subjects/sh85105062" },
      },
    })
  })

  it("returns a single object when the RDF has one top-level resource", async () => {
    global.fetch = mockRdfResponse(SIMPLE_RDF)

    const result = await fetchSubjectDetails("sh85105062")

    expect(Array.isArray(result)).toBe(false)
    expect(result).toHaveProperty("authoritativeLabel")
  })

  it("returns an array when the RDF has multiple top-level resources", async () => {
    global.fetch = mockRdfResponse(MULTIPLE_RESOURCES_RDF)

    const result = await fetchSubjectDetails("sh85105062")

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    expect(result[0].authoritativeLabel).toBe("Potatoes")
    expect(result[1].authoritativeLabel).toBe("Potato chips")
  })

  it("throws on non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      statusText: "Not Found",
    })

    await expect(fetchSubjectDetails("sh9999999")).rejects.toThrow(
      "LOC subject details returned Not Found"
    )
  })

  it("throws on fetch failure", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"))

    await expect(fetchSubjectDetails("sh85105062")).rejects.toThrow(
      "Network error"
    )
  })
})
