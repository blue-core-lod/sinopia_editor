// Copyright 2026 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"

// Renders a datetime as YYYY-MM-DD, e.g. 2021-08-08. Uses the local time zone
// unless `timeZone` is given (e.g. "UTC" for date-only values).
const IsoDate = ({ datetime, timeZone }) => {
  const date = new Date(datetime)
  if (!datetime || Number.isNaN(date.getTime())) return null

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  )
  return (
    <time title={datetime} dateTime={datetime}>
      {`${parts.year}-${parts.month}-${parts.day}`}
    </time>
  )
}

IsoDate.propTypes = {
  datetime: PropTypes.string,
  timeZone: PropTypes.string,
}

export default IsoDate
