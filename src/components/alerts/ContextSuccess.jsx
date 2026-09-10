// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import useEditorStore from "stores/editorStore"
import useAlerts from "hooks/useAlerts"
import SuccessAlert from "./SuccessAlert"
import _ from "lodash"

const ContextSuccess = () => {
  const successKey = useAlerts()
  const messages = useEditorStore((state) => state.successes?.[successKey])

  if (_.isEmpty(messages)) return null

  return <SuccessAlert messages={messages} />
}

export default ContextSuccess
