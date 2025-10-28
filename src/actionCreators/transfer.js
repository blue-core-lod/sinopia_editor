import { postTransfer } from "../sinopiaApi"
import { addError } from "actions/errors"

export const transfer = (resourceUri, keycloak, errorKey) => (dispatch) => {
  postTransfer(resourceUri, keycloak).catch((err) => {
    dispatch(
      addError(errorKey, `Error requesting transfer: ${err.message || err}`)
    )
  })
}

export const noop = () => {}
