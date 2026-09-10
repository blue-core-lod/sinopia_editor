// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import NestedPropertyHeader from "./NestedPropertyHeader"
import PropertyComponent from "./PropertyComponent"
import { selectNormProperty } from "selectors/resources"
import useEntitiesStore from "stores/entitiesStore"
import { nanoid } from "nanoid"
import useNavTarget from "hooks/useNavTarget"
import { selectPropertyTemplate } from "selectors/templates"

const NestedProperty = ({ propertyKey, readOnly }) => {
  const property = useEntitiesStore((state) =>
    selectNormProperty(state, propertyKey)
  )
  const propertyTemplate = useEntitiesStore((state) =>
    selectPropertyTemplate(state, property?.propertyTemplateKey)
  )
  const { handleNavTargetClick, navTargetId } = useNavTarget(property)
  const propertyLabelId = `labelled-by-${nanoid()}`

  // On the preview page, don't show this property if no values are present
  if (readOnly && !property.valueKeys) return null

  // onClick is to support left navigation, so ignoring jsx-ally seems reasonable.
  /* eslint-disable jsx-a11y/click-events-have-key-events */
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <div
      onClick={handleNavTargetClick}
      id={navTargetId}
      className="rtOutline"
      data-label={propertyTemplate.label}
    >
      <NestedPropertyHeader
        id={propertyLabelId}
        property={property}
        propertyTemplate={propertyTemplate}
        readOnly={readOnly}
      />
      {property.valueKeys && property.show && (
        <div className="rOutline-property">
          <PropertyComponent
            property={property}
            propertyTemplate={propertyTemplate}
            readOnly={readOnly}
          />
        </div>
      )}
    </div>
  )
}

NestedProperty.propTypes = {
  propertyKey: PropTypes.string.isRequired,
  readOnly: PropTypes.bool.isRequired,
}

export default NestedProperty
