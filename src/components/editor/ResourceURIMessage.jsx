// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { useSelector } from "react-redux"
import PropTypes from "prop-types"
import { selectUri } from "selectors/resources"
import { selectSubjectTemplateForSubject } from "selectors/templates"
import ClipboardButton from "../ClipboardButton"

// Renders the resource URI message for saved resource, and the template
// version the resource is pinned to, which is what a save records in
// sinopia:hasResourceTemplate.
const ResourceURIMessage = ({ resourceKey }) => {
  const uri = useSelector((state) => selectUri(state, resourceKey))
  const versionUri = useSelector(
    (state) => selectSubjectTemplateForSubject(state, resourceKey)?.versionUri,
  )

  if (!uri && !versionUri) {
    return null
  }

  return (
    <React.Fragment>
      {uri && (
        <p>
          URI for this resource: &lt;{uri}&gt;&nbsp;
          <ClipboardButton text={uri} label="URI" />
        </p>
      )}
      {/* The version id is the API's global Version.id, not an ordinal, so
          show the URI rather than rendering it as "v{n}". */}
      {versionUri && (
        <p>
          Template version: &lt;{versionUri}&gt;&nbsp;
          <ClipboardButton text={versionUri} label="template version URI" />
        </p>
      )}
    </React.Fragment>
  )
}

ResourceURIMessage.propTypes = {
  resourceKey: PropTypes.string.isRequired,
}

export default ResourceURIMessage
