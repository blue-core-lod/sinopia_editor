/*
 * Copyright 2019 Stanford University see LICENSE for license
 *
 * Express application for the minimal BIBFRAME Editor server. Exported
 * separately from server.js so that it can be exercised by tests without
 * binding a port.
 */

import express from "express"
import path from "path"
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
  }),
)

app.use(
  "/api/qa",
  proxy(Config.qaUpstreamUrl, {
    parseReqBody: false,
    proxyReqOptDecorator(proxyReqOpts) {
      delete proxyReqOpts.headers.origin
      return proxyReqOpts
    },
  }),
)

// Must precede the static and catch-all handlers below, which would otherwise
// answer this with the SPA's index.html.
registerHealthRoute(app)

// WARNING: This exposes the the configured environment variables at the
// /enf-config.js endpoint to be readable so is inappropriate for
// keys or other values that should not be made public.
app.get("/env-config.js", (req, res) => {
  res.type("application/javascript")
  res.send(
    `window._env_ = ${JSON.stringify({
      KEYCLOAK_URL: process.env.KEYCLOAK_URL,
      SINOPIA_URI: process.env.SINOPIA_URI,
      SINOPIA_API_BASE_URL: process.env.SINOPIA_API_BASE_URL,
    })};`,
  )
})

const distDir = path.join(__dirname, "dist")

app.get("/", (req, res) => {
  res.sendFile(path.join(distDir, "index.html"))
})

// Only the webpack output is public. fallthrough: false makes a missing asset
// 404 instead of falling into the SPA catch-all below.
app.use(
  "/dist",
  express.static(distDir, {
    dotfiles: "deny",
    index: false,
    fallthrough: false,
  }),
  // Express's default error page includes a stack trace (absolute server
  // paths) unless NODE_ENV=production, which the Dockerfile does not set.
  (err, _req, res, _next) => res.sendStatus(err.status || 500),
)

// SPA fallback for client routes only; anything that looks like a file 404s.
app.get("*", (req, res) => {
  if (path.extname(req.path)) return res.sendStatus(404)
  res.sendFile(path.join(distDir, "index.html"))
})

export default app
