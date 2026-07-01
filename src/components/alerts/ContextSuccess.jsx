// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { useSelector } from "react-redux"
import { selectSuccesses } from "selectors/errors"
import useAlerts from "hooks/useAlerts"
import SuccessAlert from "./SuccessAlert"
import _ from "lodash"

const ContextSuccess = () => {
  const successKey = useAlerts()
  const messages = useSelector((state) => selectSuccesses(state, successKey))

  if (_.isEmpty(messages)) return null

  return <SuccessAlert messages={messages} />
}

export default ContextSuccess
