/*
 * Copyright 2019 Stanford University see LICENSE for license
 *
 * Express application for the minimal BIBFRAME Editor server. Exported
 * separately from server.js so that it can be exercised by tests without
 * binding a port.
 */

import express from "express"
import Config from "./src/Config"

import cors from "cors"
import proxy from "express-http-proxy"
import { registerHealthRoute } from "./src/Health"

const app = express()

app.set("trust proxy", true)

app.use(express.urlencoded({ extended: true })) // handle URL-encoded data

app.use(cors())
app.options("*", cors())

app.use(
  "/api/search",
  proxy(Config.indexUrl, {
    parseReqBody: false,
    proxyReqOptDecorator(proxyReqOpts) {
      delete proxyReqOpts.headers.origin
      return proxyReqOpts
    },
    filter: (req) => req.method === "POST",
  })
)

app.use(
  "/api/qa",
  proxy(Config.qaUpstreamUrl, {
    parseReqBody: false,
    proxyReqOptDecorator(proxyReqOpts) {
      delete proxyReqOpts.headers.origin
      return proxyReqOpts
    },
  })
)

// Must precede the static and catch-all handlers below, which would otherwise
// answer this with the SPA's index.html.
registerHealthRoute(app)

app.get("/", (req, res) => {
  res.sendFile(`${__dirname}/dist/index.html`)
})

// Serve static assets to the browser, e.g., from src/styles/ and static/
app.use(express.static(`${__dirname}/`))

app.get("*", (req, res) => {
  res.sendFile(`${__dirname}/dist/index.html`)
})

export default app
