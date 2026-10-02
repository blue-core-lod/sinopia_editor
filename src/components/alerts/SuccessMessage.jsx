// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import useResource from "hooks/useResource"
import useAlerts from "hooks/useAlerts"
import { resourceIdFromUri } from "utilities/Utilities"

// A success message that links to a resource. Clicking loads the resource into
// the editor first; a plain route change would leave the editor on "Loading ...".
const ResourceLinkMessage = ({ text, resourceUri }) => {
  const errorKey = useAlerts()
  const { handleEdit, isLoadingEdit } = useResource(errorKey, {
    resourceURI: resourceUri,
  })

  return (
    <React.Fragment>
      {text}{" "}
      <a
        href={`/editor/resource/${resourceIdFromUri(resourceUri)}`}
        onClick={handleEdit}
      >
        {resourceUri}
      </a>
      {isLoadingEdit && " Loading ..."}
    </React.Fragment>
  )
}

ResourceLinkMessage.propTypes = {
  text: PropTypes.string.isRequired,
  resourceUri: PropTypes.string.isRequired,
}

const SuccessMessage = ({ message }) => {
  if (typeof message === "string") return message
  return <ResourceLinkMessage {...message} />
}

SuccessMessage.propTypes = {
  message: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      text: PropTypes.string.isRequired,
      resourceUri: PropTypes.string.isRequired,
    }),
  ]).isRequired,
}

export default SuccessMessage
