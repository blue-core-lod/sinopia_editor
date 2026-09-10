// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import useEditorStore from "stores/editorStore"
import ExpiringMessage from "./ExpiringMessage"

const SaveAlert = () => {
  const resourceKey = useEditorStore((state) => state.currentResource)
  const lastSave = useEditorStore((state) => state.lastSave[resourceKey])

  return (
    <ExpiringMessage timestamp={lastSave} scroll={false}>
      Saved
    </ExpiringMessage>
  )
}

export default SaveAlert
