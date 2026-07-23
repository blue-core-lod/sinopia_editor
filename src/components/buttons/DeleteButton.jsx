import React from "react"
import PropTypes from "prop-types"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrash } from "@fortawesome/free-solid-svg-icons"
import LoadingButton from "./LoadingButton"

const DeleteButton = ({
  label,
  handleClick,
  isLoading = false,
  size = "lg",
}) => {
  if (isLoading) return <LoadingButton />

  return (
    <button
      className="btn btn-link"
      title="Delete"
      aria-label={`Delete ${label}`}
      data-testid={`Delete ${label}`}
      onClick={handleClick}
    >
      <FontAwesomeIcon icon={faTrash} className={`icon-${size}`} />
    </button>
  )
}

DeleteButton.propTypes = {
  label: PropTypes.string.isRequired,
  handleClick: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  size: PropTypes.string,
}

export default DeleteButton
