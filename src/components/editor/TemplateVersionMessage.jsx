// Copyright 2026 Stanford University see LICENSE for license

import React, { useState } from "react"
import { useDispatch, useSelector, shallowEqual } from "react-redux"
import PropTypes from "prop-types"
import { setTemplateVersionCheck } from "actions/resources"
import { republishWithLatestTemplate } from "actionCreators/templateVersion"
import {
  resourceHasChangesSinceLastSave,
  selectPickSubject,
  selectTemplateVersionCheck,
} from "selectors/resources"
import { versionIdFromUri } from "utilities/Utilities"
import usePermissions from "hooks/usePermissions"
import useAlerts from "hooks/useAlerts"
import { useKeycloak } from "../../KeycloakContext"

// #210: warns that a resource was made with an older version of its template,
// says whether it fits the latest version (as Blue Core reports it), and offers
// to re-publish it with the latest version when it does.
const TemplateVersionMessage = ({ resourceKey }) => {
  const dispatch = useDispatch()
  const errorKey = useAlerts()
  const { keycloak } = useKeycloak()
  const [isRepublishing, setRepublishing] = useState(false)
  const check = useSelector((state) =>
    selectTemplateVersionCheck(state, resourceKey),
  )
  const resource = useSelector(
    (state) => selectPickSubject(state, resourceKey, ["group", "editGroups"]),
    shallowEqual,
  )
  const hasChanges = useSelector((state) =>
    resourceHasChangesSinceLastSave(state, resourceKey),
  )
  const { canEdit } = usePermissions()

  if (!check || check.dismissed) return null

  const latestId = versionIdFromUri(check.current_version_uri)
  const resourceId = versionIdFromUri(check.resource_version_uri)

  // Dismissed for as long as the resource is loaded. The check is cleared with
  // the resource, so the warning comes back the next time it is opened.
  const dismiss = () =>
    dispatch(
      setTemplateVersionCheck(resourceKey, { ...check, dismissed: true }),
    )

  const closeButton = (
    <button
      type="button"
      className="btn-close"
      aria-label="Dismiss template version message"
      onClick={dismiss}
    ></button>
  )

  if (check.republished) {
    return (
      <div
        className="alert alert-success alert-dismissible"
        role="status"
        data-testid="Template version message"
      >
        Re-published with template version id {latestId}.{closeButton}
      </div>
    )
  }

  // Re-publishing refetches the stored resource (dropping unsaved edits) and
  // leaves a resource to save under its existing group, so both have to be ok.
  let blockedReason = null
  if (hasChanges) blockedReason = "Save your changes before re-publishing."
  else if (!canEdit(resource))
    blockedReason = "You don't have permission to re-publish this resource."

  // On success this resource is swapped out, and this component with it.
  const republish = (...options) => {
    setRepublishing(true)
    return dispatch(
      republishWithLatestTemplate(resourceKey, errorKey, keycloak, ...options),
    ).finally(() => setRepublishing(false))
  }

  const actionButton = (label, onClick) => (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      disabled={!!blockedReason || isRepublishing}
      onClick={onClick}
    >
      {isRepublishing && (
        <span
          className="spinner-border spinner-border-sm me-2"
          role="status"
          aria-hidden="true"
        ></span>
      )}
      {label}
    </button>
  )
  const blockedText = blockedReason && (
    <span className="ms-2">{blockedReason}</span>
  )

  let body
  if (check.needsFields) {
    body = (
      <React.Fragment>
        <p className="mb-1">
          Re-publishing with version id {latestId} needs these fields filled in
          first:
        </p>
        <ul className="mb-2">
          {check.needsFields.map((field, index) => (
            <li key={index}>
              {field.label}: {field.message}
            </li>
          ))}
        </ul>
        {actionButton("Open with latest template", () =>
          republish({ skipValidation: true }),
        )}
        <button
          type="button"
          className="btn btn-sm btn-secondary ms-2"
          disabled={isRepublishing}
          onClick={dismiss}
        >
          Keep version id {resourceId}
        </button>
        {blockedText}
      </React.Fragment>
    )
  } else if (check.compatible === true) {
    body = (
      <React.Fragment>
        <p className="mb-2">
          This resource was made with version id {resourceId} and can be
          re-published with version id {latestId}.
        </p>
        {actionButton("Re-publish with latest template", () => republish())}
        {blockedText}
      </React.Fragment>
    )
  } else if (check.compatible === false) {
    const problems = check.incompatible_instances?.[0]?.problems ?? []
    body = (
      <React.Fragment>
        <p className="mb-1">
          This resource was made with version id {resourceId} and would not fit
          version id {latestId}:
        </p>
        <ul className="mb-1">
          {problems.map((problem, index) => (
            <li key={index}>
              {problem.property ?? problem.subject}: {problem.reason}
            </li>
          ))}
        </ul>
        <p className="mb-0">
          It will stay attached to version id {resourceId}.
        </p>
      </React.Fragment>
    )
  } else {
    body = (
      <p className="mb-0">
        Blue Core couldn&apos;t check whether this resource fits the latest
        version.
      </p>
    )
  }

  return (
    <div
      className="alert alert-warning alert-dismissible"
      role="status"
      data-testid="Template version message"
    >
      <p className="mb-1">
        <strong>Warning: a newer version of this template is available.</strong>
      </p>
      {body}
      {closeButton}
    </div>
  )
}

TemplateVersionMessage.propTypes = {
  resourceKey: PropTypes.string.isRequired,
}

export default TemplateVersionMessage
