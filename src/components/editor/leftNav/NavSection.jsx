// Copyright 2026 Stanford University see LICENSE for license

import React, { useState } from "react"
import PropTypes from "prop-types"
import { CaretDownFill, CaretRightFill } from "react-bootstrap-icons"

// A collapsed box below the property navigation, such as Versions. Its
// content is only rendered, and so only loaded, once it is opened.
const NavSection = ({ id, label, children }) => {
  const [isExpanded, setExpanded] = useState(false)
  const Caret = isExpanded ? CaretDownFill : CaretRightFill

  return (
    <section className="left-nav-section">
      <button
        type="button"
        className="left-nav-section-toggle"
        aria-expanded={isExpanded}
        aria-controls={id}
        onClick={() => setExpanded(!isExpanded)}
      >
        <Caret aria-hidden="true" />
        {label}
      </button>
      {isExpanded && (
        <div id={id} className="left-nav-section-body">
          {children}
        </div>
      )}
    </section>
  )
}

NavSection.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}

export default NavSection
