// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"

/**
 * Shows the resources title
 */
const ResourceTitle = ({ resource }) => (
  <span className="resource-label">{resource.label}</span>
)

ResourceTitle.propTypes = {
  resource: PropTypes.object.isRequired,
}

export default ResourceTitle
