import { useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import {
  newResource,
  loadResourceForEditor,
  loadResourceForPreview,
} from "actionCreators/resources"
import { selectResourceUriMap } from "selectors/resources"
import useEditorStore from "stores/editorStore"
import useEntitiesStore from "stores/entitiesStore"
import _ from "lodash"
import { useHistory } from "react-router-dom"
import { useKeycloak } from "../KeycloakContext"

const useResource = (
  errorKey,
  { resourceTemplateId = null, resourceURI = null }
) => {
  const dispatch = useDispatch()
  const history = useHistory()
  const { keycloak } = useKeycloak()
  const errors = useEditorStore((state) => state.errors[errorKey])
  const resourceKey = useEditorStore((state) => state.currentResource)
  // These are resources that are already loaded
  const resourceUriMap = useEntitiesStore((state) =>
    selectResourceUriMap(state)
  )

  const [navigateEditor, setNavigateEditor] = useState(false)
  const [status, setStatus] = useState("ready")

  useEffect(() => {
    // Forces a wait until the root resource has been set in state
    if (navigateEditor && resourceKey && _.isEmpty(errors)) {
      history.push("/editor")
    }
  }, [navigateEditor, resourceKey, history, errors])

  const handleNew = (event) => {
    if (event) event.preventDefault()
    setStatus("loading new")
    dispatch(newResource(resourceTemplateId, errorKey, true, keycloak)).then(
      (result) => {
        setStatus("ready")
        if (result) setNavigateEditor(true)
      }
    )
  }

  const handleCopy = (event) => {
    if (event) event.preventDefault()
    setStatus("loading copy")
    dispatch(
      loadResourceForEditor(
        resourceURI,
        errorKey,
        { asNewResource: true },
        keycloak
      )
    ).then((result) => {
      setStatus("ready")
      if (result) setNavigateEditor(true)
    })
  }

  const handleEdit = (event) => {
    if (event) event.preventDefault()
    // Check if already open
    if (resourceUriMap[resourceURI]) {
      useEditorStore
        .getState()
        .setCurrentEditResource(resourceUriMap[resourceURI])
      setNavigateEditor(true)
    } else {
      setStatus("loading edit")
      dispatch(loadResourceForEditor(resourceURI, errorKey, {}, keycloak)).then(
        (result) => {
          setStatus("ready")
          if (result) setNavigateEditor(true)
        }
      )
    }
  }

  const handleView = (event) => {
    if (event) event.preventDefault()
    if (resourceUriMap[resourceURI]) {
      useEditorStore
        .getState()
        .setCurrentPreviewResource(resourceUriMap[resourceURI])
      useEditorStore.getState().showModal("PreviewModal")
    } else {
      setStatus("loading view")
      dispatch(loadResourceForPreview(resourceURI, errorKey)).then((result) => {
        setStatus("ready")
        if (result) useEditorStore.getState().showModal("PreviewModal")
      })
    }
  }

  return {
    handleNew,
    handleCopy,
    handleEdit,
    handleView,
    isLoadingNew: status === "loading new",
    isLoadingCopy: status === "loading copy",
    isLoadingEdit: status === "loading edit",
    isLoadingView: status === "loading view",
  }
}

export default useResource
