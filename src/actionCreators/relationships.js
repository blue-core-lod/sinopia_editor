// Copyright 2020 Stanford University see LICENSE for license

import { setSearchRelationships } from "actions/relationships"
import { fetchResource } from "sinopiaApi"
import rdf from "rdf-ext"

const BF = "http://id.loc.gov/ontologies/bibframe/"

const refsFromDataset = (dataset) => {
  const getObjectUris = (predicate) =>
    dataset
      .match(null, rdf.namedNode(predicate), null)
      .toArray()
      .map((quad) => quad.object.value)
      .filter((v) => v.startsWith("http"))

  return {
    bfAdminMetadataRefs: getObjectUris(`${BF}adminMetadata`),
    bfItemRefs: getObjectUris(`${BF}hasItem`),
    bfInstanceRefs: [
      ...getObjectUris(`${BF}hasInstance`),
      ...getObjectUris(`${BF}itemOf`),
    ],
    bfWorkRefs: getObjectUris(`${BF}instanceOf`),
  }
}

/**
 * Relationships for resources in the editor are already tracked on the subject
 * via updateBibframeRefs as values are loaded. No separate API call is needed.
 */
export const loadRelationships = () => () => Promise.resolve(true)

/**
 * A thunk that loads relationships for a search result by fetching the resource
 * and extracting BIBFRAME ref predicates from its dataset.
 */
export const loadSearchRelationships = (uri) => (dispatch) =>
  fetchResource(uri)
    .then(([dataset]) => {
      dispatch(setSearchRelationships(uri, refsFromDataset(dataset)))
      return true
    })
    .catch((err) => {
      console.warn(
        `Could not load relationships for ${uri}: ${err.message || err}`
      )
      return false
    })
