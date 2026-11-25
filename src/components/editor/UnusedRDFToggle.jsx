// Copyright 2026 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import { useSelector } from "react-redux"
import { selectCurrentResourceKey } from "selectors/resources"
import { selectUnusedRDF } from "selectors/modals"
import _ from "lodash"

// Shows and hides the triples the template can't edit (UnusedRDFDisplay).
const UnusedRDFToggle = ({ isOpen, onToggle }) => {
  const resourceKey = useSelector((state) => selectCurrentResourceKey(state))
  const unusedRDF = useSelector((state) => selectUnusedRDF(state, resourceKey))

  if (_.isEmpty(unusedRDF)) return null

  return (
    <button
      type="button"
      className="btn btn-link unused-rdf-toggle"
      aria-expanded={isOpen}
      aria-controls="unused-rdf"
      onClick={onToggle}
    >
      View triples not editable with this template
    </button>
  )
}

UnusedRDFToggle.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
}

export default UnusedRDFToggle
