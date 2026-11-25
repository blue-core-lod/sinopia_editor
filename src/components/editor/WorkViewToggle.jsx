// Copyright 2026 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import { useSelector } from "react-redux"
import { Check } from "react-bootstrap-icons"
import { selectSubjectTemplateForSubject } from "selectors/templates"
import { kindForSubjectTemplate } from "utilities/resourceKind"

// Placeholder for the Work / Work and Instance toggle, which a later change
// will make work. For now it only shows that a work is being edited.
const WorkViewToggle = ({ resourceKey }) => {
  const kind = useSelector((state) =>
    kindForSubjectTemplate(selectSubjectTemplateForSubject(state, resourceKey)),
  )

  if (kind !== "work") return null

  return (
    <div className="work-view-toggle" role="group" aria-label="Work view">
      <button
        type="button"
        className="work-view-option active"
        aria-pressed="true"
      >
        <Check aria-hidden="true" /> Work
      </button>
      <button
        type="button"
        className="work-view-option"
        aria-pressed="false"
        disabled
      >
        Work and Instance
      </button>
    </div>
  )
}

WorkViewToggle.propTypes = {
  resourceKey: PropTypes.string.isRequired,
}

export default WorkViewToggle
