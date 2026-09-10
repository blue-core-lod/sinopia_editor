import React from "react"
import PropTypes from "prop-types"
import useEntitiesStore from "stores/entitiesStore"
import PropertyURI from "./PropertyURI"

const ValuePropertyURI = ({ propertyTemplate, value, readOnly = false }) => {
  if (propertyTemplate.ordered) return null

  const changePropertyUri = (key, uri) =>
    useEntitiesStore.getState().setValuePropertyURI(key, uri)

  return (
    <PropertyURI
      propertyTemplate={propertyTemplate}
      obj={value}
      changePropertyUri={changePropertyUri}
      readOnly={readOnly}
    />
  )
}

ValuePropertyURI.propTypes = {
  propertyTemplate: PropTypes.object.isRequired,
  value: PropTypes.object.isRequired,
  readOnly: PropTypes.bool,
}

export default ValuePropertyURI
