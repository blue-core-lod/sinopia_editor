// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faAngleRight, faAngleDown } from "@fortawesome/free-solid-svg-icons"
import { CaretDownFill, CaretRightFill } from "react-bootstrap-icons"

const ToggleButton = ({
  handleClick,
  isExpanded,
  label,
  isDisabled = false,
  variant = "angle",
}) => (
  <button
    type="button"
    className="btn btn-toggle align-baseline"
    disabled={isDisabled}
    aria-label={label}
    data-testid={label}
    aria-expanded={isExpanded ? "true" : "false"}
    onClick={handleClick}
  >
    {/* The left navigation uses filled carets; the editor body, angles */}
    {variant === "caret" &&
      (isExpanded ? (
        <CaretDownFill className="toggle-icon" aria-hidden="true" />
      ) : (
        <CaretRightFill className="toggle-icon" aria-hidden="true" />
      ))}
    {variant === "angle" && (
      <FontAwesomeIcon
        className="toggle-icon"
        icon={isExpanded ? faAngleDown : faAngleRight}
      />
    )}
  </button>
)

ToggleButton.propTypes = {
  handleClick: PropTypes.func.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  isDisabled: PropTypes.bool,
  variant: PropTypes.oneOf(["angle", "caret"]),
}

export default ToggleButton
