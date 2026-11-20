// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import ResourceTemplateRow from "./ResourceTemplateRow"

/**
 * This is the list view of all the templates
 */
const ResourceTemplateSearchResult = ({ results, showGroup = true }) => {
  const rows = results.map((row) => (
    <ResourceTemplateRow key={row.id} row={row} showGroup={showGroup} />
  ))

  return (
    <div className="row">
      <div className="col">
        <table className="table table-bordered resource-template-list">
          <thead>
            <tr>
              {/* Label takes the Group column's width when it is hidden */}
              <th style={{ width: showGroup ? "28%" : "36%" }}>Label</th>
              <th style={{ width: "18%" }}>Resource URI</th>
              <th style={{ width: "10%" }}>Author</th>
              {showGroup && <th style={{ width: "8%" }}>Group</th>}
              <th style={{ width: "10%" }}>Date</th>
              <th style={{ width: "22%" }}>Guiding statement</th>
              <th style={{ width: "4%" }} data-testid="action-col-header">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </div>
  )
}

ResourceTemplateSearchResult.propTypes = {
  results: PropTypes.array,
  showGroup: PropTypes.bool,
}

export default ResourceTemplateSearchResult
