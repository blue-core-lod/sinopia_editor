// Copyright 2019 Stanford University see LICENSE for license

import React, { useState } from "react"
import { useSelector } from "react-redux"
import PropTypes from "prop-types"
import LongDate from "components/LongDate"
import ViewButton from "../buttons/ViewButton"
import EditButton from "../buttons/EditButton"
import CopyButton from "../buttons/CopyButton"
import useResource from "hooks/useResource"
import useAlerts from "hooks/useAlerts"
import { hasSearchRelationships } from "selectors/relationships"
import RelationshipResults from "./RelationshipResults"
import { resourceToName } from "utilities/Utilities"
import ResourceTitle from "components/editor/ResourceTitle"

/**
 * Generates HTML row of all search results
 */
const SearchResultRow = ({
  row,
  canEdit,
  canCreate,
  withRelationships = true,
}) => {
  const errorKey = useAlerts()
  const {
    handleView,
    handleEdit,
    handleCopy,
    isLoadingView,
    isLoadingEdit,
    isLoadingCopy,
  } = useResource(errorKey, { resourceURI: row.uri })
  const hasRelationships =
    useSelector((state) => hasSearchRelationships(state, row.uri)) &&
    withRelationships

  const [showRelationships, setShowRelationships] = useState(false)

  const handleRelationshipsClick = (event) => {
    event.preventDefault()
    setShowRelationships(!showRelationships)
  }

  const relationshipClasses = ["btn", "btn-link", "collapse-heading"]
  if (!showRelationships) relationshipClasses.push("collapsed")
  const relationshipLabel = showRelationships
    ? `Hide relationships for ${row.uri}`
    : `Show relationships for ${row.uri}`

  const firstCellClassName = withRelationships ? "" : "ps-4 search-no-border"
  const lastCellClassName = withRelationships ? "" : "search-no-border"
  const tableRowClassName = !showRelationships ? "" : "search-no-bottom-border"

  return (
    <React.Fragment>
      <tr key={row.uri} className={tableRowClassName}>
        <td className={firstCellClassName}>
          {row.label}
          {row.primaryContributor && (
            <React.Fragment>
              <br />
              {row.primaryContributor}
            </React.Fragment>
          )}
          {hasRelationships && (
            <React.Fragment>
              <br />
              <button
                className={relationshipClasses.join(" ")}
                aria-expanded={showRelationships}
                onClick={handleRelationshipsClick}
                aria-label={relationshipLabel}
                data-testid={relationshipLabel}
              >
                Relationships
              </button>
            </React.Fragment>
          )}
        </td>
        <td>
          <ul className="list-unstyled">
            {row.type?.map((type) => (
              <li key={type}>
                <ResourceTitle
                  resource={{
                    classes: [type],
                    label: <>{resourceToName(type)}</>,
                  }}
                />
              </li>
            ))}
          </ul>
        </td>
        <td>
          <LongDate datetime={row.modified} />
        </td>
        <td className={lastCellClassName}>
          <div className="btn-group" role="group" aria-label="Result Actions">
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
        </td>
      </tr>
      {showRelationships && (
        <tr className="search-no-top-border table-light">
          <td colSpan="4" className="px-0 search-no-top-border">
            <RelationshipResults uri={row.uri} />
          </td>
        </tr>
      )}
    </React.Fragment>
  )
}

SearchResultRow.propTypes = {
  row: PropTypes.object.isRequired,
  canEdit: PropTypes.bool.isRequired,
  canCreate: PropTypes.bool.isRequired,
  withRelationships: PropTypes.bool,
}

export default SearchResultRow
