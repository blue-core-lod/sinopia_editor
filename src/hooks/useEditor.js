import { useDispatch } from "react-redux"
import { clearResource } from "actions/resources"
import useEditorStore from "stores/editorStore"
import { useHistory } from "react-router-dom"

const useEditor = (resourceKey) => {
  const dispatch = useDispatch()
  const history = useHistory()

  const resourceKeyCount = useEditorStore((state) => state.resources.length)

  const handleCloseResource = (event) => {
    if (event) event.preventDefault()

    useEditorStore.getState().clearResource(resourceKey)
    dispatch(clearResource(resourceKey))
    // If this is the last resource, then return to dashboard.
    if (resourceKeyCount <= 1) history.push("/dashboard")
  }

  return { handleCloseResource }
}

export default useEditor
