// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrashAlt } from "@fortawesome/free-solid-svg-icons"
import PropertyLabel from "./PropertyLabel"
import PropertyLabelInfo from "./PropertyLabelInfo"
import { showProperty, hideProperty } from "actions/resources"
import { expandProperty, contractProperty } from "actionCreators/resources"
import { useDispatch } from "react-redux"
import ToggleButton from "../ToggleButton"
import useAlerts from "hooks/useAlerts"
import PropertyPropertyURI from "./PropertyPropertyURI"

const NestedPropertyHeader = ({ property, propertyTemplate, readOnly }) => {
  const errorKey = useAlerts()
  const dispatch = useDispatch()

  const toggleLabel =
    property.show === true
      ? `Hide ${propertyTemplate.label}`
      : `Show ${propertyTemplate.label}`
  const trashIcon = faTrashAlt

  const isAdd = !readOnly && !property.valueKeys

  const toggleProperty = (event) => {
    event.preventDefault()
    if (property.show) {
      dispatch(hideProperty(property.key))
    } else {
      dispatch(showProperty(property.key))
    }
  }

  if (isAdd) {
    return (
      <React.Fragment>
        <div className="row">
          <div className="col">
            <button
              type="button"
              className="btn btn-add btn-add-property"
              onClick={() => dispatch(expandProperty(property.key, errorKey))}
              aria-label={`Add ${propertyTemplate.label}`}
              data-testid={`Add ${propertyTemplate.label}`}
              data-id={property.key}
            >
              + Add{" "}
              <strong>
                <PropertyLabel
                  required={propertyTemplate.required}
                  label={propertyTemplate.label}
                />
              </strong>
            </button>
            <PropertyLabelInfo propertyTemplate={propertyTemplate} />
          </div>
        </div>
        <PropertyPropertyURI
          propertyTemplate={propertyTemplate}
          property={property}
          readOnly={readOnly}
        />
      </React.Fragment>
    )
  }

  return (
    <div className="row">
      <div className="col">
        <ToggleButton
          handleClick={toggleProperty}
          isExpanded={property.show}
          isDisabled={isAdd}
          label={toggleLabel}
        />
        <strong>
          <PropertyLabel
            required={propertyTemplate.required}
            label={propertyTemplate.label}
          />
        </strong>
        <PropertyLabelInfo propertyTemplate={propertyTemplate} />
      </div>
      {!readOnly && (
        <div className="col">
          <button
            type="button"
            className="btn btn-sm btn-remove pull-right"
            onClick={() => dispatch(contractProperty(property.key))}
            aria-label={`Remove ${propertyTemplate.label}`}
            data-testid={`Remove ${propertyTemplate.label}`}
            data-id={property.key}
          >
            <FontAwesomeIcon className="trash-icon" icon={trashIcon} />
          </button>
        </div>
      )}
    </div>
  )
}

NestedPropertyHeader.propTypes = {
  property: PropTypes.object.isRequired,
  propertyTemplate: PropTypes.object.isRequired,
  readOnly: PropTypes.bool.isRequired,
}

export default NestedPropertyHeader
