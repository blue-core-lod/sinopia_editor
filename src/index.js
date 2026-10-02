// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { createRoot } from "react-dom/client"
import RootContainer from "./components/RootContainer"
import "@popperjs/core"
import "bootstrap"

const container = document.createElement("div")
container.className = "container-fluid"
document.body.appendChild(container)

// React 19 removed ReactDOM.render; createRoot is the only entry point.
createRoot(container).render(React.createElement(RootContainer))
