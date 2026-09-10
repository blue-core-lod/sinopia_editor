// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import useEditorStore from "stores/editorStore"
import CloseButton from "./actions/CloseButton"
import SaveAndPublishButton from "./actions/SaveAndPublishButton"
import MarcButton from "./actions/MarcButton"
import TransferButtons from "./actions/TransferButtons"

// CopyToNewButton and PreviewButton are now called from ResourceComponent
const EditorActions = () => {
  const currentResourceKey = useEditorStore((state) => state.currentResource)

  return (
    <div className="row">
      <div className="d-flex justify-content-end">
        <MarcButton resourceKey={currentResourceKey} />
        <TransferButtons resourceKey={currentResourceKey} />
        <CloseButton css={"editor-action-close"} label={"Close"} />
        <SaveAndPublishButton class="editor-save" />
      </div>
    </div>
  )
}

export default EditorActions
