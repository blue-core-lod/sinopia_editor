/* eslint max-params: ["error", 5] */
import { useState, useEffect } from "react"
import { newResourceFromDataset } from "actionCreators/resources"
import useEditorStore from "stores/editorStore"
import { useHistory } from "react-router-dom"

/**
 * Hook for transforming a resource to state and changing the page to the editor (i.e., /editor path).
 * @param {rdf.Dataset} dataset containing resource
 * @param {string} baseURI of the resource
 * @param {string} resourceTemplateId to use for the resource
 * @param {string} errorKey to use when adding errors to state
 * @param {Object} history react-router history object
 * @return {[Object, rdf.Dataset, string]} resource state, unused RDF, error
 */
const useRdfResource = (dataset, baseURI, resourceTemplateId, errorKey) => {
  const history = useHistory()
  const hasResource = useEditorStore((state) => !!state.currentResource)

  // Indicates that would like to change to editor once resource is in state
  const [navigateEditor, setNavigateEditor] = useState(false)

  useEffect(() => {
    if (!dataset || baseURI === undefined || !resourceTemplateId) {
      return
    }
    useEditorStore.getState().clearErrors(errorKey)
    newResourceFromDataset(
      dataset,
      baseURI,
      resourceTemplateId,
      errorKey,
      true
    ).then((result) => {
      setNavigateEditor(result)
    })
  }, [dataset, baseURI, resourceTemplateId, errorKey])

  useEffect(() => {
    // Forces a wait until the root resource has been set in state
    if (navigateEditor && hasResource) {
      history.push("/editor")
    }
  }, [navigateEditor, history, hasResource])
}

export default useRdfResource
