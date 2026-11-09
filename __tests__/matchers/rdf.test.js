import { datasetFromN3 } from "utilities/Utilities"
import { expectIsomorphic } from "rdfUtils"

describe("toBeIsomorphicTo", () => {
  const n3 = `<> <http://sinopia.io/p1> "one"@en .
<> <http://sinopia.io/p2> _:b1 .
_:b1 <http://sinopia.io/p3> "two" .`

  it("passes for the same triples with different blank-node labels and order", async () => {
    await expectIsomorphic(
      n3,
      `_:other <http://sinopia.io/p3> "two" .
<> <http://sinopia.io/p2> _:other .
<> <http://sinopia.io/p1> "one"@en .`,
    )
  })

  it("fails when the actual dataset has an extra triple, and names it", async () => {
    const actual = await datasetFromN3(
      `${n3}\n<> <http://sinopia.io/p4> "extra" .`,
    )
    const expected = await datasetFromN3(n3)

    expect(() => expect(actual).toBeIsomorphicTo(expected)).toThrow(
      '+ <> <http://sinopia.io/p4> "extra" .',
    )
  })

  it("fails when the actual dataset is missing a triple, and names it", async () => {
    const actual = await datasetFromN3('<> <http://sinopia.io/p1> "one"@en .')
    const expected = await datasetFromN3(
      `<> <http://sinopia.io/p1> "one"@en .\n<> <http://sinopia.io/p5> <http://sinopia.io/o> .`,
    )

    expect(() => expect(actual).toBeIsomorphicTo(expected)).toThrow(
      "- <> <http://sinopia.io/p5> <http://sinopia.io/o> .",
    )
  })

  it("fails when only a language tag or datatype differs", async () => {
    const actual = await datasetFromN3('<> <http://sinopia.io/p1> "one" .')
    const tagged = await datasetFromN3('<> <http://sinopia.io/p1> "one"@en .')
    const typed = await datasetFromN3(
      '<> <http://sinopia.io/p1> "one"^^<http://www.w3.org/2001/XMLSchema#token> .',
    )

    expect(actual).not.toBeIsomorphicTo(tagged)
    expect(actual).not.toBeIsomorphicTo(typed)
  })

  it("rejects values that are not datasets", () => {
    expect(() =>
      expect("<> <p> <o> .").toBeIsomorphicTo("<> <p> <o> ."),
    ).toThrow("expected both values to be rdf-ext datasets")
  })
})
