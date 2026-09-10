// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import useEditorStore from "stores/editorStore"
import ExpiringMessage from "./ExpiringMessage"

const CopyToNewMessage = () => {
  const oldUri = useEditorStore((state) => state.copyToNewMessage.oldUri)
  const timestamp = useEditorStore((state) => state.copyToNewMessage.timestamp)

  return (
    <ExpiringMessage timestamp={timestamp}>
      Copied {oldUri} to new resource.
    </ExpiringMessage>
  )
}

export default CopyToNewMessage
