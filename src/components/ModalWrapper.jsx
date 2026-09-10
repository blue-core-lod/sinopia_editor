// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import useEditorStore from "stores/editorStore"
import _ from "lodash"
import { DialogOverlay, DialogContent } from "@reach/dialog"
import "@reach/dialog/styles.css"

const ModalWrapper = ({
  modalName,
  initialInputRef = null,
  header = null,
  body,
  footer = null,
  size = "md",
  ariaLabel,
  handleClose = null,
  ...props
}) => {
  const show = useEditorStore(
    (state) => (_.last(state.currentModal) || null) === modalName
  )

  const close = (event) => {
    useEditorStore.getState().hideModal()
    event.preventDefault()
  }

  if (!show) return null

  const wrapperClasses = ["modal-wrapper"]
  if (size === "lg") wrapperClasses.push("modal-wrapper-lg")

  return (
    <DialogOverlay
      initialFocusRef={initialInputRef}
      className={wrapperClasses.join(" ")}
      onDismiss={handleClose || close}
    >
      <DialogContent aria-label={ariaLabel} {...props}>
        <div className="card">
          <div className="card-header">
            {header}
            <button
              type="button"
              className="btn-close"
              onClick={handleClose || close}
              aria-label="Close"
              data-testid="Close"
            ></button>
          </div>
          <div className="card-body">{body}</div>
          {footer && <div className="card-footer">{footer}</div>}
        </div>
      </DialogContent>
    </DialogOverlay>
  )
}

ModalWrapper.propTypes = {
  modalName: PropTypes.string.isRequired,
  header: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.arrayOf(PropTypes.node),
  ]),
  body: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.arrayOf(PropTypes.node),
  ]),
  footer: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.arrayOf(PropTypes.node),
  ]),
  initialInputRef: PropTypes.object,
  size: PropTypes.oneOf(["md", "lg"]),
  ariaLabel: PropTypes.string.isRequired,
  handleClose: PropTypes.func,
}

export default ModalWrapper
