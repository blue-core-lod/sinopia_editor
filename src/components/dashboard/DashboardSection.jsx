// Copyright 2026 Stanford University see LICENSE for license

import React, { useState } from "react"
import PropTypes from "prop-types"

/**
 * A titled dashboard list that the user can collapse from its heading.
 */
const DashboardSection = ({ id, title, children }) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const contentId = `${id}-content`

  const toggleClasses = ["dashboard-section-toggle"]
  if (!isExpanded) toggleClasses.push("collapsed")

  return (
    <div className="dashboard-section">
      <h2>
        <button
          type="button"
          className={toggleClasses.join(" ")}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {title}
        </button>
      </h2>
      <div id={contentId} hidden={!isExpanded}>
        {children}
      </div>
    </div>
  )
}

DashboardSection.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
}

export default DashboardSection
