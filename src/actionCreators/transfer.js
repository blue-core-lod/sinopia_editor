import { postTransfer } from "../sinopiaApi"
import { addError, addSuccess } from "actions/errors"

export const transfer = (resourceUri, keycloak, errorKey) => (dispatch) => postTransfer(resourceUri, keycloak)
    .then(() => {
      dispatch(
        addSuccess(
          errorKey,
          `Export of ${resourceUri} requested. You will be notified by email once processed.`
        )
      )
    })
    .catch((err) => {
      dispatch(
        addError(errorKey, `Error requesting transfer: ${err.message || err}`)
      )
    })

export const noop = () => {}
