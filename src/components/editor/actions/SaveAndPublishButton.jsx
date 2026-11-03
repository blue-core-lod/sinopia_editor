// Copyright 2019 Stanford University see LICENSE for license

import React, { useState } from "react"
import { useSelector, useDispatch, shallowEqual } from "react-redux"
import PropTypes from "prop-types"
import { saveResource as saveResourceAction } from "actionCreators/resources"
import { checkTemplateChange } from "actionCreators/templateUsage"
import {
  resourceHasChangesSinceLastSave,
  selectPickSubject,
  selectCurrentResourceKey,
  selectTemplateUsage,
} from "selectors/resources"
import {
  displayResourceValidations,
  hasValidationErrors as hasValidationErrorsSelector,
} from "selectors/errors"
import {
  showModal as showModalAction,
  hideModal as hideModalAction,
} from "actions/modals"
import {
  showValidationErrors as showValidationErrorsAction,
  hideValidationErrors as hideValidationErrorsAction,
} from "actions/errors"
import { useKeycloak } from "../../../KeycloakContext"

import useAlerts from "hooks/useAlerts"

const SaveAndPublishButton = (props) => {
  const dispatch = useDispatch()
  const errorKey = useAlerts()
  const { keycloak } = useKeycloak()

  const resourceKey = useSelector((state) => selectCurrentResourceKey(state))
  // selectPickSubject and shallowEqual prevents rerender from unrelated changed.
  const resource = useSelector(
    (state) =>
      selectPickSubject(state, resourceKey, ["group", "editGroups", "uri"]),
    shallowEqual,
  )
  const resourceHasChanged = useSelector((state) =>
    resourceHasChangesSinceLastSave(state),
  )
  const hasValidationErrors = useSelector((state) =>
    hasValidationErrorsSelector(state, resourceKey),
  )
  const validationErrorsAreShowing = useSelector((state) =>
    displayResourceValidations(state, resourceKey),
  )
  // Only template resources have usage, so only they are checked before saving.
  const templateUsage = useSelector((state) =>
    selectTemplateUsage(state, resourceKey),
  )
  const [isChecking, setChecking] = useState(false)

  const isSaved = !!resource.uri
  const isDisabled =
    isChecking ||
    !resourceHasChanged ||
    (validationErrorsAreShowing && hasValidationErrors)

  const formIsValid = () => {
    if (hasValidationErrors) {
      dispatch(showValidationErrorsAction(resourceKey))
      return false
    }
    dispatch(hideValidationErrorsAction(resourceKey))
    return true
  }

  const handleClick = (event) => {
    event.preventDefault()
    if (formIsValid()) {
      const save = () =>
        dispatch(
          saveResourceAction(
            resourceKey,
            resource.group,
            resource.editGroups,
            errorKey,
            keycloak,
          ),
        )
      if (isSaved && templateUsage?.instance_count && !templateUsage.copied) {
        // Warning 2 of #209. A check that fails resolves null and saves.
        setChecking(true)
        dispatch(checkTemplateChange(resourceKey, keycloak)).then((result) => {
          setChecking(false)
          if (result?.requires_new_version) {
            dispatch(showModalAction("TemplateVersionWarningModal"))
          } else {
            save()
          }
        })
      } else if (isSaved) {
        save()
      } else {
        // Show group chooser
        dispatch(hideModalAction())
        dispatch(showModalAction("GroupChoiceModal"))
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
