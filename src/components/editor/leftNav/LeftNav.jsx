import React from "react"
import { useSelector } from "react-redux"
import PropTypes from "prop-types"
import PanelResourceNav from "./PanelResourceNav"
import Versions from "./Versions"
import Relationships from "./Relationships"
import NavSection from "./NavSection"
import { hasRelationships as hasRelationshipsSelector } from "selectors/relationships"

// The property navigation, followed by collapsed Relationships and Versions
// boxes for a saved resource (Figma: BLUE-CORE, edit resource).
const LeftNav = ({ resource }) => {
  const hasRelationships = useSelector((state) =>
    hasRelationshipsSelector(state, resource.key),
  )

  // Keyed by resource so each resource opens with its boxes collapsed
  return (
    <div className="col-md-5 col-lg-4 col-xl-3 left-nav">
      <PanelResourceNav resource={resource} />
      {resource.uri && hasRelationships && (
        <NavSection
          key={`relationships-${resource.key}`}
          id="left-nav-relationships"
          label="Relationships"
        >
          <Relationships resourceKey={resource.key} />
        </NavSection>
      )}
      {resource.uri && (
        <NavSection
          key={`versions-${resource.key}`}
          id="left-nav-versions"
          label="Versions"
        >
          <Versions resource={resource} />
        </NavSection>
      )}
    </div>
  )
}

LeftNav.propTypes = {
  resource: PropTypes.object.isRequired,
}

export default LeftNav
