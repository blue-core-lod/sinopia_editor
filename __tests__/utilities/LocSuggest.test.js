import suggest from "utilities/LocSuggest"

const mockResponse = [
  "potato",
  ["Potatoes", "Potato chips"],
  ["Potatoes (May Subd Geog)", "Potato chips (May Subd Geog)"],
  [
    "http://id.loc.gov/authorities/subjects/sh85105062",
    "http://id.loc.gov/authorities/subjects/sh85105063",
  ],
]

describe("suggest()", () => {
  it("fetches results with default offset", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await suggest("potato", "SimpleType")

    expect(result).toEqual(mockResponse)
    expect(global.fetch).toHaveBeenCalledWith(
      "https://id.loc.gov/authorities/subjects/suggest2/?q=potato&rdftype=SimpleType&count=25&offset=0&searchtype=left"
    )
  })

  it("passes offset parameter", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    await suggest("potato", "ComplexSubject", 25)

    expect(global.fetch).toHaveBeenCalledWith(
      "https://id.loc.gov/authorities/subjects/suggest2/?q=potato&rdftype=ComplexSubject&count=25&offset=25&searchtype=left"
    )
  })

  it("throws on non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      statusText: "Service Unavailable",
    })

    await expect(suggest("potato", "SimpleType")).rejects.toThrow(
      "LOC Suggest Service returned Service Unavailable"
    )
  })

  it("throws on fetch failure", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"))

    await expect(suggest("potato", "SimpleType")).rejects.toThrow(
      "Network error"
    )
  })
})
