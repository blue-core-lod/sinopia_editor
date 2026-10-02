// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { useSelector, useDispatch } from "react-redux"
import PropTypes from "prop-types"
import { hideModal } from "actions/modals"
import { isCurrentModal } from "selectors/modals"
import * as Dialog from "@radix-ui/react-dialog"

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
  const dispatch = useDispatch()
  const show = useSelector((state) => isCurrentModal(state, modalName))

  const close = (event) => {
    dispatch(hideModal())
    event.preventDefault()
  }

  if (!show) return null

  const wrapperClasses = ["modal-wrapper"]
  if (size === "lg") wrapperClasses.push("modal-wrapper-lg")

  const dismiss = handleClose || close

  /*
   * Radix drives dismissal through onEscapeKeyDown/onPointerDownOutside, both of
   * which receive an event. onOpenChange does not, and every handleClose passed
   * in by a consumer calls event.preventDefault(). Visibility is owned by redux
   * (isCurrentModal), so preventing Radix's own close is correct here — the
   * hideModal dispatch inside dismiss is what actually closes the modal.
   */
  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay">
          <Dialog.Content
            className={wrapperClasses.join(" ")}
            aria-label={ariaLabel}
            onEscapeKeyDown={dismiss}
            onPointerDownOutside={dismiss}
            onOpenAutoFocus={(event) => {
              if (!initialInputRef?.current) return
              event.preventDefault()
              initialInputRef.current.focus()
            }}
            {...props}
          >
            <div className="card">
              <div className="card-header">
                {header}
                <button
                  type="button"
                  className="btn-close"
                  onClick={dismiss}
                  aria-label="Close"
                  data-testid="Close"
                ></button>
              </div>
              <div className="card-body">{body}</div>
              {footer && <div className="card-footer">{footer}</div>}
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
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
