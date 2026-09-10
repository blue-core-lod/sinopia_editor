// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import useEditorStore from "stores/editorStore"
import ModalWrapper from "../../ModalWrapper"
import SaveAndPublishButton from "../actions/SaveAndPublishButton"
import ResourceDisplay from "./ResourceDisplay"
import _ from "lodash"

const EditorPreviewModal = () => {
  const show = useEditorStore(
    (state) => (_.last(state.currentModal) || null) === "RDFModal"
  )
  const resourceKey = useEditorStore((state) => state.currentResource)

  const header = <h4 className="modal-title">Preview</h4>

  const body = show ? (
    <ResourceDisplay
      resourceKey={resourceKey}
      defaultFormat="table"
      displayRelationships={false}
    />
  ) : null

  const footer = <SaveAndPublishButton class="modal-save" />

  return (
    <ModalWrapper
      modalName="RDFModal"
      header={header}
      body={body}
      footer={footer}
      data-testid="rdf-modal"
      ariaLabel="Preview"
      size="lg"
    />
  )
}

export default EditorPreviewModal
