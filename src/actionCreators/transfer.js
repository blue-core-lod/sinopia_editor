import { postTransfer } from "../sinopiaApi"
import { addError, addSuccess } from "actions/errors"

export const transfer =
  (resourceUri, localId, keycloak, errorKey) => (dispatch) =>
    postTransfer(
      { instance_uri: resourceUri, local_id: localId || null },
      keycloak
    )
      .then(() => {
        const message = localId
          ? `Export of ${resourceUri} using identifier ${localId} requested. You will be notified by email once processed.`
          : `Export of ${resourceUri} requested. You will be notified by email once processed.`
        dispatch(addSuccess(errorKey, message))
      })
      .catch((err) => {
        dispatch(
          addError(errorKey, `Error requesting transfer: ${err.message || err}`)
        )
      })

export const noop = () => {}
