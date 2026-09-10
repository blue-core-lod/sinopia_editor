// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { useSelector } from "react-redux"
import useEditorStore from "stores/editorStore"
import { selectFullSubject } from "selectors/resources"
import ModalWrapper from "components/ModalWrapper"
import _ from "lodash"
import ResourceDiffer from "ResourceDiffer"
import DiffDisplay from "./DiffDisplay"

const DiffModal = () => {
  const { compareFrom, compareTo } = useEditorStore(
    (state) => state.currentDiff
  )
  const show = useEditorStore(
    (state) => (_.last(state.currentModal) || null) === "DiffModal"
  )
  const compareFromResource = useSelector((state) =>
    selectFullSubject(state, compareFrom)
  )
  const compareToResource = useSelector((state) =>
    selectFullSubject(state, compareTo)
  )

  let diff = null
  if (show && compareFromResource && compareToResource)
    diff = new ResourceDiffer(compareFromResource, compareToResource).diff

  const close = (event) => {
    useEditorStore.getState().hideModal()
    useEditorStore.getState().setCurrentDiffResources(null, null)
    event.preventDefault()
  }

  const header = (
    <h4 className="modal-title" id="view-resource-modal-title">
      Compare
    </h4>
  )

  const body = diff ? <DiffDisplay diff={diff} /> : null

  return (
    <ModalWrapper
      modalName="DiffModal"
      ariaLabel="Compare"
      data-testid="diff-modal"
      handleClose={close}
      header={header}
      body={body}
    />
  )
}

export default DiffModal
