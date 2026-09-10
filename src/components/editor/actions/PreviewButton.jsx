// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEye } from "@fortawesome/free-solid-svg-icons"
import useEditorStore from "stores/editorStore"

const PreviewButton = () => {
  const handleClick = (event) => {
    useEditorStore.getState().showModal("RDFModal")
    event.preventDefault()
  }

  return (
    <button
      type="button"
      className="btn btn-link"
      aria-label="Preview resource"
      title="Preview resource"
      onClick={handleClick}
    >
      <FontAwesomeIcon icon={faEye} className="icon-lg" />
    </button>
  )
}

export default PreviewButton
