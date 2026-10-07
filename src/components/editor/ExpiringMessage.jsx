// Copyright 2019 Stanford University see LICENSE for license

import React, { useState, useEffect, useLayoutEffect, useRef } from "react"
import PropTypes from "prop-types"

const ExpiringMessage = ({ timestamp, children, scroll = true }) => {
  const [prevLastSave, setPrevLastSave] = useState(timestamp)
  const inputRef = useRef(null)

  // Nothing to show until a new timestamp arrives, and nothing to show again
  // once this one has been acknowledged.
  const expired = !timestamp || prevLastSave === timestamp

  // The timer lives inside the effect that clears it. Previously it was created
  // during render, below an early return, and the cleanup closed over a const
  // declared after it -- which only worked because Babel downleveled the const
  // to a hoisted var, making the `timer !== undefined` guard read as false and
  // the cleanup a silent no-op.
  useEffect(() => {
    if (expired) return undefined
    const timer = setTimeout(() => setPrevLastSave(timestamp), 3000)
    return () => clearTimeout(timer)
  }, [expired, timestamp])

  useLayoutEffect(() => {
    if (!scroll || !timestamp) return
    inputRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    })
  }, [scroll, timestamp])

  if (expired) {
    return null
  }

  return (
    <div className="alert alert-success" ref={inputRef}>
      {children}
    </div>
  )
}

ExpiringMessage.propTypes = {
  children: PropTypes.oneOfType([PropTypes.array, PropTypes.string]).isRequired,
  timestamp: PropTypes.number,
  scroll: PropTypes.bool,
}

export default ExpiringMessage
