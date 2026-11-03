// Copyright 2026 Stanford University see LICENSE for license

import React from "react"
import { useSelector, useDispatch, shallowEqual } from "react-redux"
import { hideModal } from "actions/modals"
import { saveResource as saveResourceAction } from "actionCreators/resources"
import {
  selectCurrentResourceKey,
  selectPickSubject,
  selectTemplateUsage,
} from "selectors/resources"
import { versionIdFromUri } from "utilities/Utilities"
import useAlerts from "hooks/useAlerts"
import ModalWrapper from "../../ModalWrapper"
import { useKeycloak } from "KeycloakContext"

// Which versions the resources made with a template stay attached to. For a
// nested template the API reports the versions of the templates that nest it,
// whose ids would name the wrong template, so those are counted, not listed.
const attachedMessage = (usage) => {
  const count = usage.instance_count
  const ownVersions = usage.versions.filter((version) =>
    version.version_uri?.startsWith(`${usage.profile_uri}/version/`),
  )
  if (ownVersions.length === 1 && ownVersions[0].instance_count === count)
    return (
      <p>
        The {count} existing resource(s) will remain attached to version id{" "}
        {versionIdFromUri(ownVersions[0].version_uri)} and will not be changed.
      </p>
    )

  const nestingCount =
    count -
    ownVersions.reduce((sum, version) => sum + version.instance_count, 0)
  return (
    <React.Fragment>
      <p>
        The {count} existing resource(s) will remain attached to the template
        versions they were made with and will not be changed:
      </p>
      <ul>
        {ownVersions.map((version) => (
          <li key={version.version_uri}>
            version id {versionIdFromUri(version.version_uri)}:{" "}
            {version.instance_count} resource(s)
          </li>
        ))}
        {nestingCount > 0 && (
          <li>made with templates that nest this one: {nestingCount}</li>
        )}
      </ul>
    </React.Fragment>
  )
}

// Warning 2 of #209: shown on save when the API reports that resources made
// with this template could not move to the edited version.
const TemplateVersionWarningModal = () => {
  const dispatch = useDispatch()
  const errorKey = useAlerts()
  const { keycloak } = useKeycloak()
  const resourceKey = useSelector((state) => selectCurrentResourceKey(state))
  const resource = useSelector(
    (state) =>
      selectPickSubject(state, resourceKey, ["group", "editGroups", "label"]),
    shallowEqual,
  )
  const usage = useSelector((state) => selectTemplateUsage(state, resourceKey))

  if (!usage) return null

  const close = (event) => {
    dispatch(hideModal())
    event.preventDefault()
  }

  const saveAndClose = (event) => {
    dispatch(hideModal())
    dispatch(
      saveResourceAction(
        resourceKey,
        resource.group,
        resource.editGroups,
        errorKey,
        keycloak,
      ),
    )
    event.preventDefault()
  }

  const versionId = versionIdFromUri(usage.current_version_uri)
  const header = (
    <h4 className="modal-title">
      Template: {resource.label}
      {versionId && ` (version id ${versionId})`}
    </h4>
  )

  const body = (
    <React.Fragment>
      <p>
        The changes you have made to this template require a new template
        version since existing resources will not be compatible with it.
      </p>
      {attachedMessage(usage)}
    </React.Fragment>
  )

  const footer = (
    <React.Fragment>
      <button
        className="btn btn-link btn-sm"
        onClick={close}
        aria-label="Cancel saving new template version"
      >
        Cancel
      </button>
      <button
        className="btn btn-primary btn-sm"
        onClick={saveAndClose}
        aria-label="Save new template version"
      >
        Save new version
      </button>
    </React.Fragment>
  )

  return (
    <ModalWrapper
      header={header}
      body={body}
      footer={footer}
      modalName="TemplateVersionWarningModal"
      ariaLabel="Template version warning"
    />
  )
}

export default TemplateVersionWarningModal
