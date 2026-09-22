// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { useSelector } from "react-redux"
import PropTypes from "prop-types"
import LongDate from "components/LongDate"
import usePermissions from "hooks/usePermissions"
import { selectGroupMap } from "selectors/groups"
import EditButton from "../buttons/EditButton"
import CopyButton from "../buttons/CopyButton"
import NewButton from "../buttons/NewButton"
import ViewButton from "../buttons/ViewButton"
import useResource from "hooks/useResource"
import useAlerts from "hooks/useAlerts"

/**
 * This is the list view of all the templates
 */
const ResourceTemplateRow = ({ row }) => {
  const { canCreate, canEdit, hasRole } = usePermissions()
  // Templates are managed by role: anyone may view, but creating/copying and
  // editing are each gated on a Keycloak realm role in addition to the
  // existing group checks.
  const canCreateTemplate = canCreate && hasRole("template_create")
  const canEditTemplate = canEdit(row) && hasRole("template_edit")
  const errorKey = useAlerts()
  const groupMap = useSelector((state) => selectGroupMap(state))

  const {
    handleNew,
    handleCopy,
    handleEdit,
    handleView,
    isLoadingNew,
    isLoadingCopy,
    isLoadingEdit,
    isLoadingView,
  } = useResource(errorKey, {
    resourceURI: row.originalURI || row.uri,
    resourceTemplateId: row.id,
  })

  return (
    <tr key={row.id}>
      <td style={{ wordBreak: "break-all" }} data-testid="name">
        <span>{row.resourceLabel}</span>
        <br />
        {row.id}
      </td>
      <td style={{ wordBreak: "break-all" }}>{row.resourceURI}</td>
      <td style={{ wordBreak: "break-all" }}>{row.author}</td>
      <td style={{ wordBreak: "break-all" }}>
        {groupMap[row.group] || "Unknown"}
      </td>
      <td>
        <LongDate datetime={row.date} timeZone="UTC" />
      </td>
      <td style={{ wordBreak: "break-all" }}>{row.remark}</td>
      <td>
        <div className="btn-group" role="group" aria-label="Result Actions">
          {canCreateTemplate && (
            <NewButton
              label={row.resourceLabel}
              handleClick={handleNew}
              isLoading={isLoadingNew}
            />
          )}
          <ViewButton
            label={row.resourceLabel}
            handleClick={handleView}
            isLoading={isLoadingView}
          />
          {canEditTemplate && (
            <EditButton
              label={row.resourceLabel}
              handleClick={handleEdit}
              isLoading={isLoadingEdit}
            />
          )}
          {canCreateTemplate && (
            <CopyButton
              label={row.resourceLabel}
              handleClick={handleCopy}
              isLoading={isLoadingCopy}
            />
          )}
        </div>
      </td>
    </tr>
  )
}

ResourceTemplateRow.propTypes = {
  row: PropTypes.object,
}

export default ResourceTemplateRow
