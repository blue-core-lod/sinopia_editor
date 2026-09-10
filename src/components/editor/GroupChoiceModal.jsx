// Copyright 2019 Stanford University see LICENSE for license

import React, { useState, useRef } from "react"
import { useSelector, useDispatch } from "react-redux"
import {
  saveNewResource,
  saveResource as saveResourceAction,
} from "actionCreators/resources"
import { selectNormSubject } from "selectors/resources"
import useEditorStore from "stores/editorStore"
import useAuthenticateStore from "stores/authenticateStore"
import { selectGroupMap } from "selectors/groups"
import usePermissions from "hooks/usePermissions"
import useAlerts from "hooks/useAlerts"
import ModalWrapper from "../ModalWrapper"
import { useKeycloak } from "KeycloakContext"

const GroupChoiceModal = () => {
  const errorKey = useAlerts()
  const resourceKey = useEditorStore((state) => state.currentResource)
  const resource = useSelector((state) => selectNormSubject(state, resourceKey))
  const userGroupIds = useAuthenticateStore((state) => state.user?.groups)
  const groupMap = useSelector((state) => selectGroupMap(state))
  const [ownerGroupId, setOwnerGroupId] = useState(
    resource.group || userGroupIds[0]
  )
  const initialInputRef = useRef()

  const ownerGroupLabel = groupMap[ownerGroupId]
  const { canChangeGroups } = usePermissions()
  const canChange = canChangeGroups(resource) || !resource.uri
  const dispatch = useDispatch()
  const { keycloak } = useKeycloak()

  const ownerGroupOptions = userGroupIds.map((groupId) => (
    <option key={groupId} value={groupId}>
      {groupMap[groupId] || groupId}
    </option>
  ))

  const handleOwnerChange = (event) => {
    setOwnerGroupId(event.target.value)
    event.preventDefault()
  }

  const saveAndClose = (event) => {
    if (resource.uri) {
      dispatch(
        saveResourceAction(resourceKey, ownerGroupId, [], errorKey, keycloak)
      )
    } else {
      dispatch(
        saveNewResource(resourceKey, ownerGroupId, [], errorKey, keycloak)
      )
    }
    useEditorStore.getState().hideModal()
    event.preventDefault()
  }

  const close = (event) => {
    useEditorStore.getState().hideModal()
    event.preventDefault()
  }

  const body = (
    <React.Fragment>
      <label htmlFor="ownerSelect">
        <h4>Who owns this?</h4>
      </label>
      {canChange ? (
        <select
          ref={initialInputRef}
          className="form-select mb-4"
          id="ownerSelect"
          onBlur={handleOwnerChange}
          onChange={handleOwnerChange}
          value={ownerGroupId}
          data-testid="Who owns this?"
        >
          {ownerGroupOptions}
        </select>
      ) : (
        <p>{ownerGroupLabel}</p>
      )}
    </React.Fragment>
  )

  const footer = (
    <React.Fragment>
      <button
        className="btn btn-link btn-sm"
        onClick={close}
        aria-label="Cancel Save Group"
      >
        Cancel
      </button>
      {canChange && (
        <button
          className="btn btn-primary btn-sm"
          data-dismiss="modal"
          aria-label="Save Group"
          data-testid="Save Group"
          onClick={saveAndClose}
        >
          Save
        </button>
      )}
    </React.Fragment>
  )

  return (
    <ModalWrapper
      initialInputRef={initialInputRef}
      body={body}
      footer={footer}
      modalName="GroupChoiceModal"
      ariaLabel="Select permissions"
      data-testid="group-choice-modal"
    />
  )
}

export default GroupChoiceModal
