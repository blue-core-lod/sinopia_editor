import React from "react"
import PropTypes from "prop-types"
import LoadingButton from "./LoadingButton"

// Figma "image 86": document with a magnifying glass (no FontAwesome match)
const viewIcon = require("../../styles/view-icon.png")

const ViewButton = ({ label, handleClick, isLoading = false, size = "lg" }) => {
  if (isLoading) return <LoadingButton />

  return (
    <button
      className="btn btn-link"
      title="View"
      aria-label={`View ${label}`}
      data-testid={`View ${label}`}
      onClick={handleClick}
    >
      <img src={viewIcon} alt="" className={`view-icon icon-${size}`} />
    </button>
  )
}

ViewButton.propTypes = {
  label: PropTypes.string.isRequired,
  handleClick: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  size: PropTypes.string,
}

export default ViewButton
