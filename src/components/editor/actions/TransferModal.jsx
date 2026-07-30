import React, { useState, useRef } from "react"
import PropTypes from "prop-types"
import { useDispatch } from "react-redux"
import { hideModal } from "actions/modals"
import { transfer } from "actionCreators/transfer"
import ModalWrapper from "../../ModalWrapper"
import { useKeycloak } from "../../../KeycloakContext"

const TransferModal = ({ modalName, label, resourceUri, errorKey }) => {
  const dispatch = useDispatch()
  const { keycloak } = useKeycloak()
  const [localId, setLocalId] = useState("")
  const initialInputRef = useRef()

  const handleLocalIdChange = (event) => setLocalId(event.target.value)

  const handleOverlayClick = (event) => {
    dispatch(transfer(resourceUri, localId.trim(), keycloak, errorKey))
    dispatch(hideModal())
    event.preventDefault()
  }

  const handleExportClick = (event) => {
    dispatch(transfer(resourceUri, null, keycloak, errorKey))
    dispatch(hideModal())
    event.preventDefault()
  }

  const header = <h4 className="modal-title">Export to {label}</h4>

  const body = (
    <React.Fragment>
      <div className="mb-4">
        <p>
          Create a new catalog instance (or overlay an existing instance) with
          the current Bluecore URI.
        </p>
        <button
          type="button"
          className="btn btn-transfer"
          onClick={handleExportClick}
        >
          {`Export to ${label}`}
        </button>
      </div>
      <div>
        <label htmlFor={`transferLocalId-${modalName}`}>
          Overlay existing catalog record with the following local identifier
          (e.g. HRID)
        </label>
        <div className="d-flex align-items-start">
          <input
            ref={initialInputRef}
            id={`transferLocalId-${modalName}`}
            type="text"
            className="form-control transfer-local-id-input me-2"
            value={localId}
            onChange={handleLocalIdChange}
          />
          <button
            type="button"
            className="btn btn-transfer"
            disabled={!localId.trim()}
            onClick={handleOverlayClick}
          >
            Overlay by Identifier
          </button>
        </div>
      </div>
    </React.Fragment>
  )

  return (
    <ModalWrapper
      initialInputRef={initialInputRef}
      modalName={modalName}
      header={header}
      body={body}
      ariaLabel={`Export to ${label}`}
      className="transfer-modal"
    />
  )
}

TransferModal.propTypes = {
  modalName: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  resourceUri: PropTypes.string.isRequired,
  errorKey: PropTypes.string.isRequired,
}

export default TransferModal
