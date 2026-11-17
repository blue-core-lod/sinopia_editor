// Copyright 2019 Stanford University see LICENSE for license

import React, { useState } from "react"
import { useSelector } from "react-redux"
import PropTypes from "prop-types"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCaretDown, faCaretUp } from "@fortawesome/free-solid-svg-icons"
import IsoDate from "components/IsoDate"
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
const SearchResultRow = ({ row, canEdit, canCreate }) => {
  const errorKey = useAlerts()
  const {
    handleView,
    handleEdit,
    handleCopy,
    isLoadingView,
    isLoadingEdit,
    isLoadingCopy,
  } = useResource(errorKey, { resourceURI: row.uri })
  const hasRelationships = useSelector((state) =>
    hasSearchRelationships(state, row.uri),
  )

  const [showRelationships, setShowRelationships] = useState(false)

  const handleRelationshipsClick = (event) => {
    event.preventDefault()
    setShowRelationships(!showRelationships)
  }

  const relationshipLabel = showRelationships
    ? `Hide relationships for ${row.uri}`
    : `Show relationships for ${row.uri}`

  return (
    <tr>
      <td>
        {row.label}
        {row.primaryContributor && (
          <React.Fragment>
            <br />
            {row.primaryContributor}
          </React.Fragment>
        )}
        {hasRelationships && (
          <div>
            <button
              type="button"
              className="btn btn-link search-relationships-toggle"
              aria-expanded={showRelationships}
              onClick={handleRelationshipsClick}
              aria-label={relationshipLabel}
              data-testid={relationshipLabel}
            >
              <FontAwesomeIcon
                icon={showRelationships ? faCaretUp : faCaretDown}
              />
              Relationships
            </button>
            {showRelationships && <RelationshipResults uri={row.uri} />}
          </div>
        )}
      </td>
      <td>
        <ul className="search-result-classes">
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
      <td className="search-result-modified">
        <IsoDate datetime={row.modified} />
      </td>
      <td>
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
  )
}

SearchResultRow.propTypes = {
  row: PropTypes.object.isRequired,
  canEdit: PropTypes.bool.isRequired,
  canCreate: PropTypes.bool.isRequired,
}

export default SearchResultRow
