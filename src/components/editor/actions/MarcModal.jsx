import React from "react"
import useEditorStore from "stores/editorStore"
import ModalWrapper from "../../ModalWrapper"
import ClipboardButton from "../../ClipboardButton"

const MarcModal = () => {
  const marc = useEditorStore((state) => state.marc)

  const body = (
    <React.Fragment>
      <div className="mb-2">
        <ClipboardButton text={marc} label="MARC" />
      </div>
      <pre className="p-3">
        <bdi>{marc}</bdi>
      </pre>
    </React.Fragment>
  )

  return (
    <ModalWrapper
      body={body}
      modalName="MarcModal"
      ariaLabel="MARC record"
      size="lg"
    />
  )
}

export default MarcModal
