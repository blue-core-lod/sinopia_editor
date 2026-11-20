import rdf from "rdf-ext"

const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label"
const BF_TITLE = "http://id.loc.gov/ontologies/bibframe/title"
const BF_MAIN_TITLE = "http://id.loc.gov/ontologies/bibframe/mainTitle"

/**
 * Extracts a human-readable label from an rdf-ext Dataset for the given URI.
 * Tries rdfs:label first, then bf:title/bf:mainTitle.
 * Returns null if no label is found.
 */
export const labelFromDataset = (uri, dataset) => {
  const rdfsMatch = dataset
    .match(rdf.namedNode(uri), rdf.namedNode(RDFS_LABEL), null)
    .toArray()[0]
  if (rdfsMatch) return rdfsMatch.object.value

  const titleNode = dataset
    .match(rdf.namedNode(uri), rdf.namedNode(BF_TITLE), null)
    .toArray()[0]?.object
  if (titleNode) {
    const mainTitleMatch = dataset
      .match(titleNode, rdf.namedNode(BF_MAIN_TITLE), null)
      .toArray()[0]
    if (mainTitleMatch) return mainTitleMatch.object.value
  }

  return null
}

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"

/**
 * Builds a resource result, in the shape search results take, from a fetched
 * resource (see fetchResource).
 */
export const resultFromDataset = (uri, dataset, response) => ({
  uri,
  label: labelFromDataset(uri, dataset) ?? uri,
  type: dataset
    .match(rdf.namedNode(uri), rdf.namedNode(RDF_TYPE), null)
    .toArray()
    .map((q) => q.object.value),
  // The Blue Core API calls this field updated_at.
  modified: response.timestamp ?? response.updated_at,
  group: response.group,
  editGroups: response.editGroups ?? [],
})

export const isBfInstance = (classes) => {
  if (!classes) return false
  return classes.includes("http://id.loc.gov/ontologies/bibframe/Instance")
}

export const isBfWork = (classes) => {
  if (!classes) return false
  return classes.includes("http://id.loc.gov/ontologies/bibframe/Work")
}

export const isBfItem = (classes) => {
  if (!classes) return false
  return classes.includes("http://id.loc.gov/ontologies/bibframe/Item")
}

export const isBfHub = (classes) => {
  if (!classes) return false
  return classes.includes("http://id.loc.gov/ontologies/bibframe/Hub")
}

export const isBfWorkInstanceItem = (classes) =>
  isBfWork(classes) || isBfInstance(classes) || isBfItem(classes)

export const isBfAdminMetadata = (classes) => {
  if (!classes) return false
  return classes.includes("http://id.loc.gov/ontologies/bibframe/AdminMetadata")
}
