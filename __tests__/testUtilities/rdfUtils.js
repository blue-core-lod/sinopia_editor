import { datasetFromN3 } from "utilities/Utilities"

const toDataset = (value) =>
  typeof value === "string" ? datasetFromN3(value) : Promise.resolve(value)

/**
 * Asserts two graphs hold exactly the same triples, up to blank-node labels.
 * @param {rdf.Dataset|string} actual dataset, or N3
 * @param {rdf.Dataset|string} expected dataset, or N3
 */
export const expectIsomorphic = async (actual, expected) => {
  const [actualDataset, expectedDataset] = await Promise.all([
    toDataset(actual),
    toDataset(expected),
  ])
  expect(actualDataset).toBeIsomorphicTo(expectedDataset)
}
