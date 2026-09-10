// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import useEntitiesStore from "stores/entitiesStore"
import PropTypes from "prop-types"
import { selectUri } from "selectors/resources"
import ClipboardButton from "../ClipboardButton"

// Renders the resource URI message for saved resource
const ResourceURIMessage = ({ resourceKey }) => {
  const uri = useEntitiesStore((state) => selectUri(state, resourceKey))

  if (!uri) {
    return null
  }

  return (
    <p>
      URI for this resource: &lt;{uri}&gt;&nbsp;
      <ClipboardButton text={uri} label="URI" />
    </p>
  )
}

ResourceURIMessage.propTypes = {
  resourceKey: PropTypes.string.isRequired,
}

export default ResourceURIMessage
