// Copyright 2019 Stanford University see LICENSE for license

import React, { forwardRef } from "react"
import PropTypes from "prop-types"

const SuccessWrapper = forwardRef(({ children }, ref) => (
  <div ref={ref} className="row">
    <div className="col" style={{ marginTop: "10px" }}>
      <div className="alert alert-success" role="alert">
        {children}
      </div>
    </div>
  </div>
))
SuccessWrapper.displayName = "SuccessWrapper"

SuccessWrapper.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.arrayOf(PropTypes.node),
  ]),
}

export default SuccessWrapper
