// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { shallow } from "zustand/shallow"
import useEntitiesStore from "stores/entitiesStore"
import PropTypes from "prop-types"
import { saveResource as saveResourceAction } from "actionCreators/resources"
import {
  resourceHasChangesSinceLastSave,
  selectPickSubject,
} from "selectors/resources"
import { hasValidationErrors as hasValidationErrorsSelector } from "selectors/errors"
import useEditorStore from "stores/editorStore"
import { useKeycloak } from "../../../KeycloakContext"

import useAlerts from "hooks/useAlerts"

const SaveAndPublishButton = (props) => {
  const errorKey = useAlerts()
  const { keycloak } = useKeycloak()

  const resourceKey = useEditorStore((state) => state.currentResource)
  // selectPickSubject and shallow prevents rerender from unrelated changed.
  const resource = useEntitiesStore(
    (state) =>
      selectPickSubject(state, resourceKey, ["group", "editGroups", "uri"]),
    shallow
  )
  const resourceHasChanged = useEntitiesStore((state) =>
    resourceHasChangesSinceLastSave(state)
  )
  const hasValidationErrors = useEntitiesStore((state) =>
    hasValidationErrorsSelector(state, resourceKey)
  )
  const validationErrorsAreShowing = useEditorStore(
    (state) => !!state.resourceValidation[resourceKey]
  )

  const isSaved = !!resource.uri
  const isDisabled =
    !resourceHasChanged || (validationErrorsAreShowing && hasValidationErrors)

  const formIsValid = () => {
    if (hasValidationErrors) {
      useEditorStore.getState().showValidationErrors(resourceKey)
      return false
    }
    useEditorStore.getState().hideValidationErrors(resourceKey)
    return true
  }

  const handleClick = (event) => {
    event.preventDefault()
    if (formIsValid()) {
      if (isSaved) {
        saveResourceAction(
          resourceKey,
          resource.group,
          resource.editGroups,
          errorKey,
          keycloak
        )
      } else {
        // Show group chooser
        useEditorStore.getState().hideModal()
        useEditorStore.getState().showModal("GroupChoiceModal")
      }
    }
  }

  return (
    <button
      className={`btn btn-primary ${props.class}`}
      onClick={handleClick}
      aria-label="Save"
      disabled={isDisabled}
    >
      Save
    </button>
  )
}

SaveAndPublishButton.propTypes = {
  class: PropTypes.string,
}

export default SaveAndPublishButton
