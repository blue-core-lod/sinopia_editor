/*
 * Copyright 2019 Stanford University see LICENSE for license
 *
 * Health check, shared by the express server (app.js) and the webpack dev
 * server so that /health returns the same JSON on every surface instead of
 * falling through to the SPA's index.html.
 *
 * CommonJS on purpose: webpack.config.js is loaded by plain node without
 * babel, so it cannot require an ES module.
 */

const healthPayload = () => ({ status: "ok" })

const healthHandler = (req, res) => {
  res.json(healthPayload())
}

/*
 * Registers GET /health on an express app or router. Must be called before any
 * static, catch-all, or history-fallback handler, which would otherwise answer
 * first with index.html.
 */
const registerHealthRoute = (app) => {
  app.get("/health", healthHandler)
  return app
}

module.exports = { healthPayload, healthHandler, registerHealthRoute }
