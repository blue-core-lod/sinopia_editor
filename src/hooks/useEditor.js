import useEditorStore from "stores/editorStore"
import useEntitiesStore from "stores/entitiesStore"
import { useHistory } from "react-router-dom"

const useEditor = (resourceKey) => {
  const history = useHistory()

  const resourceKeyCount = useEditorStore((state) => state.resources.length)

  const handleCloseResource = (event) => {
    if (event) event.preventDefault()

    useEditorStore.getState().clearResource(resourceKey)
    useEntitiesStore.getState().clearResource(resourceKey)
    // If this is the last resource, then return to dashboard.
    if (resourceKeyCount <= 1) history.push("/dashboard")
  }

  return { handleCloseResource }
}

export default useEditor
