// Copyright 2026 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import { kindBadges } from "utilities/resourceKind"

// The letter badge for a resource kind: a circle for works, a diamond for
// instances and a square for templates. Hidden from screen readers unless
// given a label, since it is usually next to text that names the kind.
const KindBadge = ({ kind, label }) => {
  const letter = kindBadges[kind]
  if (!letter) return null

  const a11yProps = label
    ? { role: "img", "aria-label": label, title: label }
    : { "aria-hidden": "true" }

  return (
    <span className={`kind-badge kind-badge-${kind}`} {...a11yProps}>
      <span>{letter}</span>
    </span>
  )
}

KindBadge.propTypes = {
  kind: PropTypes.string.isRequired,
  label: PropTypes.string,
}

export default KindBadge
