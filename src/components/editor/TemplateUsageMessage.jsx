// Copyright 2026 Stanford University see LICENSE for license

import React, { useState } from "react"
import { useSelector } from "react-redux"
import PropTypes from "prop-types"
import { selectTemplateUsage, selectUri } from "selectors/resources"

// Warning 1 of #209: tells someone editing or copying a template how many
// resources were made with it, before they change anything.
const TemplateUsageMessage = ({ resourceKey }) => {
  const usage = useSelector((state) => selectTemplateUsage(state, resourceKey))
  const uri = useSelector((state) => selectUri(state, resourceKey))
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !usage?.instance_count) return null
  const count = usage.instance_count

  let message
  if (usage.copied) {
    // Once saved, the copy is a new profile that nothing uses yet.
    if (uri) return null
    message = (
      <React.Fragment>
        <strong>The template you copied is used by {count} resource(s).</strong>{" "}
        Those resources stay attached to the original template.
      </React.Fragment>
    )
  } else {
    if (uri !== usage.profile_uri) return null
    message = (
      <React.Fragment>
        <strong>This template is used by {count} resource(s).</strong> Each save
        creates a new template version. Existing resources stay attached to the
        version they were made with. If a change would not fit the data in those
        resources, you&apos;ll be asked to confirm before saving.
      </React.Fragment>
    )
  }

  return (
    <div
      className="alert alert-warning alert-dismissible"
      role="status"
      data-testid="Template usage message"
    >
      {message}
      <button
        type="button"
        className="btn-close"
        aria-label="Dismiss template usage message"
        onClick={() => setDismissed(true)}
      ></button>
    </div>
  )
}

TemplateUsageMessage.propTypes = {
  resourceKey: PropTypes.string.isRequired,
}

export default TemplateUsageMessage
