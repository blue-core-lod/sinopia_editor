// Copyright 2026 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import ViewButton from "../buttons/ViewButton"
import EditButton from "../buttons/EditButton"
import CopyButton from "../buttons/CopyButton"
import useResource from "hooks/useResource"
import useAlerts from "hooks/useAlerts"

/**
 * One related resource under a search result's Relationships toggle,
 * e.g. "Instance: A stone is a story" followed by its actions.
 */
const RelationshipResultRow = ({ kind, row, canEdit, canCreate }) => {
  const errorKey = useAlerts()
  const {
    handleView,
    handleEdit,
    handleCopy,
    isLoadingView,
    isLoadingEdit,
    isLoadingCopy,
  } = useResource(errorKey, { resourceURI: row.uri })

  return (
    <li className="search-relationship-row">
      <span>
        {kind}: {row.label}
      </span>
      <div
        className="btn-group"
        role="group"
        aria-label={`Actions for ${row.label}`}
      >
        <ViewButton
          label={row.label}
          handleClick={handleView}
          isLoading={isLoadingView}
        />
        {canEdit && (
          <EditButton
            label={row.label}
            handleClick={handleEdit}
            isLoading={isLoadingEdit}
          />
        )}
        {canCreate && (
          <CopyButton
            label={row.label}
            handleClick={handleCopy}
            isLoading={isLoadingCopy}
          />
        )}
      </div>
    </li>
  )
}

RelationshipResultRow.propTypes = {
  kind: PropTypes.string.isRequired,
  row: PropTypes.object.isRequired,
  canEdit: PropTypes.bool.isRequired,
  canCreate: PropTypes.bool.isRequired,
}

export default RelationshipResultRow
