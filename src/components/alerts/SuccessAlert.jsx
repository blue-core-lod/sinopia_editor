// Copyright 2019 Stanford University see LICENSE for license

import React, { useRef, useState, useLayoutEffect } from "react"
import PropTypes from "prop-types"
import SuccessWrapper from "./SuccessWrapper"
import _ from "lodash"

const SuccessAlert = ({ messages }) => {
  const ref = useRef()
  const [lastMessages, setLastMessages] = useState(false)

  useLayoutEffect(() => {
    if (_.isEqual(lastMessages, messages)) return
    if (!_.isEmpty(messages)) window.scrollTo(0, ref.current.offsetTop)
    setLastMessages([...messages])
  }, [messages, lastMessages])

  if (_.isEmpty(messages)) return null

  const messageText = messages.map((message) => <p key={message}>{message}</p>)

  return <SuccessWrapper ref={ref}>{messageText}</SuccessWrapper>
}

SuccessAlert.propTypes = {
  messages: PropTypes.array.isRequired,
}

export default SuccessAlert
