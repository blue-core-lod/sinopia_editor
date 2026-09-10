import React from "react"
import PropTypes from "prop-types"
import useEntitiesStore from "stores/entitiesStore"
import PropertyURI from "./PropertyURI"

const PropertyPropertyURI = ({
  propertyTemplate,
  property,
  readOnly = false,
}) => {
  if (!propertyTemplate.ordered) return null

  const changePropertyUri = (key, uri) =>
    useEntitiesStore.getState().setPropertyPropertyURI(key, uri)

  return (
    <PropertyURI
      propertyTemplate={propertyTemplate}
      obj={property}
      changePropertyUri={changePropertyUri}
      readOnly={readOnly}
    />
  )
}

PropertyPropertyURI.propTypes = {
  propertyTemplate: PropTypes.object.isRequired,
  property: PropTypes.object.isRequired,
  readOnly: PropTypes.bool,
}

export default PropertyPropertyURI
