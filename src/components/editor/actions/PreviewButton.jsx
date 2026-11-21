// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { useDispatch } from "react-redux"
import { showModal } from "actions/modals"

// A page with a magnifying glass (Figma: BLUE-CORE, edit resource). Neither
// icon set has one.
const PreviewIcon = () => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M11 21H6.5A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3H14l5 5v3" />
    <path d="M14 3v5h5" />
    <path d="M8 9h3M8 12.5h5M8 16h2" />
    <circle cx="15.5" cy="16" r="3" />
    <path d="m17.7 18.2 2.8 2.8" />
  </svg>
)

const PreviewButton = () => {
  const dispatch = useDispatch()

  const handleClick = (event) => {
    dispatch(showModal("RDFModal"))
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
      <PreviewIcon />
    </button>
  )
}

export default PreviewButton
