import { postTransfer } from "../sinopiaApi"
import useEditorStore from "stores/editorStore"

export const transfer =
  (resourceUri, localId, keycloak, errorKey) => () => {
    const body = { instance_uri: resourceUri }
    if (localId) body.local_id = localId

    return postTransfer(body, keycloak)
      .then(() => {
        const message = localId
          ? `Export of ${resourceUri} using identifier ${localId} requested. You will be notified by email once processed.`
          : `Export of ${resourceUri} requested. You will be notified by email once processed.`
        useEditorStore.getState().addSuccess(errorKey, message)
      })
      .catch((err) => {
        useEditorStore
          .getState()
          .addError(
            errorKey,
            `Error requesting transfer: ${err.message || err}`
          )
      })
  }

export const noop = () => {}
