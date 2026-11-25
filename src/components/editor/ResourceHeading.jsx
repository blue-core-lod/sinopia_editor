// Copyright 2026 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import { useSelector } from "react-redux"
import { selectSubjectTemplateForSubject } from "selectors/templates"
import { kindForSubjectTemplate, kindLabels } from "utilities/resourceKind"
import KindBadge from "./KindBadge"
import ResourceTitle from "./ResourceTitle"
import PreviewButton from "./actions/PreviewButton"
import CopyToNewButton from "./actions/CopyToNewButton"

// The resource's kind badge, title, and preview and copy buttons.
const ResourceHeading = ({ resource, id }) => {
  const kind = useSelector((state) =>
    kindForSubjectTemplate(
      selectSubjectTemplateForSubject(state, resource.key),
    ),
  )

  return (
    <h3 id={id} className="resource-heading">
      <KindBadge kind={kind} label={kindLabels[kind]} />
      <ResourceTitle resource={resource} />
      <PreviewButton />
      <CopyToNewButton />
    </h3>
  )
}

ResourceHeading.propTypes = {
  resource: PropTypes.object.isRequired,
  id: PropTypes.string,
}

export default ResourceHeading
