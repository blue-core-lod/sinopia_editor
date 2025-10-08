// Copyright 2020 Stanford University see LICENSE for license

import { setRelationships, setSearchRelationships } from "actions/relationships"
import { clearErrors } from "actions/errors"
import { fetchResourceRelationships } from "sinopiaApi"

/**
 * A thunk that loads inferred relationships from the Sinopia API and adds to state.
 * @return true if successful
 */
export const loadRelationships = (resourceKey, uri, errorKey) => (dispatch) => {
  dispatch(clearErrors(errorKey))
  return fetchResourceRelationships(uri)
    .then((relationships) => {
      dispatch(
        setRelationships(resourceKey, {
          bfAdminMetadataRefs: relationships.bfAdminMetadataInferredRefs,
          bfItemRefs: relationships.bfItemInferredRefs,
          bfInstanceRefs: relationships.bfInstanceInferredRefs,
          bfWorkRefs: relationships.bfWorkInferredRefs,
        })
      )
      return true
    })
    .catch((err) => {
      // Relationships endpoint is optional and not supported by all APIs (e.g., Blue Core)
      // Silently fail without dispatching errors to avoid blocking resource loading
      console.warn(`Relationships endpoint not available for ${uri}, skipping relationships loading`)
      return false
    })
}

export const loadSearchRelationships = (uri, errorKey) => (dispatch) =>
  fetchResourceRelationships(uri)
    .then((relationships) => {
      dispatch(
        setSearchRelationships(uri, {
          bfItemRefs: relationships.bfItemAllRefs,
          bfInstanceRefs: relationships.bfInstanceAllRefs,
          bfWorkRefs: relationships.bfWorkAllRefs,
        })
      )
      return true
    })
    .catch((err) => {
      // Relationships endpoint is optional and not supported by all APIs (e.g., Blue Core)
      // Silently fail without dispatching errors to avoid blocking resource loading
      console.warn(`Relationships endpoint not available for ${uri}, skipping relationships loading`)
      return false
    })
