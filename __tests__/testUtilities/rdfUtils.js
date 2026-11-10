import { datasetFromN3 } from "utilities/Utilities"

const toDataset = (value, baseIRI) =>
  typeof value === "string"
    ? datasetFromN3(value, baseIRI)
    : Promise.resolve(value)

/**
 * Asserts two graphs hold exactly the same triples, up to blank-node labels.
 * @param {rdf.Dataset|string} actual dataset, or N3
 * @param {rdf.Dataset|string} expected dataset, or N3
 * @param {string} [baseIRI] base IRI against which relative IRIs (e.g., <>) in N3 are resolved
 */
export const expectIsomorphic = async (actual, expected, baseIRI) => {
  const [actualDataset, expectedDataset] = await Promise.all([
    toDataset(actual, baseIRI),
    toDataset(expected, baseIRI),
  ])
  expect(actualDataset).toBeIsomorphicTo(expectedDataset)
}
