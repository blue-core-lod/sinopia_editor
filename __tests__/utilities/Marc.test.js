import { marcToMarcXml, marcToBibframe } from "utilities/Marc"

// ── MARC21 binary fixture builder ─────────────────────────────────────────────
// Builds a minimal MARC21 binary buffer with a 001 control field and a 245
// data field (one $a subfield), both with space indicators.
function buildMarcBuffer({ controlData = "test001", titleData = "Test Title" } = {}) {
  const field001Data = [
    ...Array.from(controlData).map((c) => c.charCodeAt(0)),
    0x1e, // field terminator
  ]
  const field245Data = [
    0x20, // ind1 = ' '
    0x20, // ind2 = ' '
    0x1f, // subfield delimiter
    0x61, // code 'a'
    ...Array.from(titleData).map((c) => c.charCodeAt(0)),
    0x1e, // field terminator
  ]

  // baseAddress = leader (24) + directory (2 entries × 12) + dir field terminator (1)
  const baseAddress = 24 + 12 * 2 + 1
  const recordLength =
    baseAddress + field001Data.length + field245Data.length

  // Leader: 24 chars
  const leader = `${String(recordLength).padStart(5, "0")}nam a22${String(
    baseAddress
  ).padStart(5, "0")} c 4500`

  // Directory entries: tag (3) + length (4) + start (5) = 12 chars each
  const dir001 = `001${String(field001Data.length).padStart(4, "0")}${String(
    0
  ).padStart(5, "0")}`
  const dir245 = `245${String(field245Data.length).padStart(4, "0")}${String(
    field001Data.length
  ).padStart(5, "0")}`

  const bytes = [
    ...Array.from(leader).map((c) => c.charCodeAt(0)),
    ...Array.from(dir001).map((c) => c.charCodeAt(0)),
    ...Array.from(dir245).map((c) => c.charCodeAt(0)),
    0x1e, // directory field terminator
    ...field001Data,
    ...field245Data,
  ]

  return new Uint8Array(bytes).buffer
}

// Concatenate two ArrayBuffers into one (simulates a multi-record .mrc file)
function concatBuffers(a, b) {
  const out = new Uint8Array(a.byteLength + b.byteLength)
  out.set(new Uint8Array(a), 0)
  out.set(new Uint8Array(b), a.byteLength)
  return out.buffer
}

// ── marcToMarcXml ─────────────────────────────────────────────────────────────
describe("marcToMarcXml()", () => {
  it("wraps output in a MARCXML collection envelope", () => {
    const xml = marcToMarcXml(buildMarcBuffer())
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/)
    expect(xml).toContain('<collection xmlns="http://www.loc.gov/MARC21/slim">')
    expect(xml).toContain("</collection>")
  })

  it("emits the leader inside a <record>", () => {
    const xml = marcToMarcXml(buildMarcBuffer())
    expect(xml).toContain("<record>")
    // leader length is always 24 chars; just check it's there
    expect(xml).toMatch(/<leader>.{24}<\/leader>/)
  })

  it("converts a control field (001) to <controlfield>", () => {
    const xml = marcToMarcXml(buildMarcBuffer())
    expect(xml).toContain('<controlfield tag="001">test001</controlfield>')
  })

  it("converts a data field (245) to <datafield> with indicators and subfields", () => {
    const xml = marcToMarcXml(buildMarcBuffer())
    expect(xml).toContain('<datafield tag="245" ind1=" " ind2=" ">')
    expect(xml).toContain('<subfield code="a">Test Title</subfield>')
    expect(xml).toContain("</datafield>")
  })

  it("XML-escapes special characters in field data", () => {
    const xml = marcToMarcXml(
      buildMarcBuffer({ titleData: 'A & B <"C">' })
    )
    expect(xml).toContain(
      '<subfield code="a">A &amp; B &lt;&quot;C&quot;&gt;</subfield>'
    )
  })

  it("parses all records in a multi-record buffer", () => {
    const buf = concatBuffers(
      buildMarcBuffer({ controlData: "rec001" }),
      buildMarcBuffer({ controlData: "rec002" })
    )
    const xml = marcToMarcXml(buf)
    expect(xml).toContain('<controlfield tag="001">rec001</controlfield>')
    expect(xml).toContain('<controlfield tag="001">rec002</controlfield>')
    expect((xml.match(/<record>/g) || []).length).toBe(2)
  })

  it("returns an empty collection for an empty buffer", () => {
    const xml = marcToMarcXml(new ArrayBuffer(0))
    expect(xml).toContain('<collection xmlns="http://www.loc.gov/MARC21/slim">')
    expect(xml).not.toContain("<record>")
  })
})

// ── marcToBibframe ────────────────────────────────────────────────────────────
const mockMarcXml =
  '<?xml version="1.0"?><collection xmlns="http://www.loc.gov/MARC21/slim"><record/></collection>'
const mockTurtle = `@prefix bf: <http://id.loc.gov/ontologies/bibframe/> .`

describe("marcToBibframe()", () => {
  it("POSTs MARCXML to the configured URL with correct default headers", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockTurtle),
    })

    await marcToBibframe(mockMarcXml)

    expect(global.fetch).toHaveBeenCalledWith(
      "https://id.loc.gov/transform/marc2bibframe2",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/marcxml+xml",
          Accept: "text/turtle",
        },
        body: mockMarcXml,
      }
    )
  })

  it("returns the RDF text on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockTurtle),
    })

    const result = await marcToBibframe(mockMarcXml)
    expect(result).toBe(mockTurtle)
  })

  it("accepts a custom RDF format", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("{}"),
    })

    await marcToBibframe(mockMarcXml, "application/ld+json")

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/ld+json" }),
      })
    )
  })

  it("throws on a non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      statusText: "Internal Server Error",
    })

    await expect(marcToBibframe(mockMarcXml)).rejects.toThrow(
      "marc2bibframe service returned Internal Server Error"
    )
  })

  it("throws on a network failure", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"))

    await expect(marcToBibframe(mockMarcXml)).rejects.toThrow("Network error")
  })
})
