// Copyright 2019 Stanford University see LICENSE for license

import React, { useEffect } from "react"
import useEditorStore from "stores/editorStore"
import useAlerts from "hooks/useAlerts"
import Alert from "./Alert"
import _ from "lodash"

const ContextAlert = () => {
  const errorKey = useAlerts()
  const errors = useEditorStore((state) => state.errors[errorKey])

  useEffect(() => {
    if (!_.isEmpty(errors)) useEditorStore.getState().hideModal()
  }, [errors])

  if (_.isEmpty(errors)) return null

  return <Alert errors={errors} />
}

export default ContextAlert
