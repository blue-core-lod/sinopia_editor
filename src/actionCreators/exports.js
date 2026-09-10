import Config from "Config"
import useEditorStore from "stores/editorStore"
import useEntitiesStore from "stores/entitiesStore"
import { hasExports } from "selectors/exports"

export const fetchExports = (errorKey) => {
  // Return if already loaded.
  if (hasExports(useEntitiesStore.getState())) return

  useEditorStore.getState().clearErrors(errorKey)
  // Not using AWS SDK because requires credentials, which is way too much overhead.
  return fetch(Config.exportBucketUrl)
    .then((response) => response.text())
    .then((str) => new DOMParser().parseFromString(str, "text/xml"))
    .then((data) => {
      const elems = data.getElementsByTagName("Key")
      const keys = []
      for (let i = 0; i < elems.length; i++) {
        keys.push(elems.item(i).innerHTML)
      }
      useEntitiesStore.getState().exportsReceived(keys)
    })
    .catch((err) =>
      useEditorStore
        .getState()
        .addError(
          errorKey,
          `Error retrieving list of exports: ${err.message || err}`
        )
    )
}

export const noop = () => {}
