// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { useSelector } from "react-redux"
import { selectUri } from "selectors/resources"
import useEditorStore from "stores/editorStore"
import { hasValidationErrors as hasValidationErrorsSelector } from "selectors/errors"

// Renders the permissions link for saved resource
const PermissionsAction = () => {
  const resourceKey = useEditorStore((state) => state.currentResource)
  const uri = useSelector((state) => selectUri(state, resourceKey))

  const hasValidationErrors = useSelector((state) =>
    hasValidationErrorsSelector(state, resourceKey)
  )
  const validationErrorsAreShowing = useEditorStore(
    (state) => !!state.resourceValidation[resourceKey]
  )

  const showGroupChooser = () =>
    useEditorStore.getState().showModal("GroupChoiceModal")

  const handleClick = (event) => {
    showGroupChooser()
    event.preventDefault()
  }

  if (!uri) return null

  if (validationErrorsAreShowing && hasValidationErrors) return null

  return (
    <button
      type="button"
      className="btn btn-link float-end"
      onClick={handleClick}
    >
      Permissions
    </button>
  )
}

export default PermissionsAction
