// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { useSelector } from "react-redux"
import PropTypes from "prop-types"
import { selectUri } from "selectors/resources"
import ClipboardButton from "../ClipboardButton"

// Renders the URI of a saved resource, with a button to copy it.
const ResourceURIMessage = ({ resourceKey }) => {
  const uri = useSelector((state) => selectUri(state, resourceKey))

  if (!uri) return null

  return (
    <span className="resource-uri">
      URI:{" "}
      <a href={uri} target="_blank" rel="noopener noreferrer">
        {uri}
      </a>
      <ClipboardButton text={uri} label="URI" iconOnly />
    </span>
  )
}

ResourceURIMessage.propTypes = {
  resourceKey: PropTypes.string.isRequired,
}

export default ResourceURIMessage
