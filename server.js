/*
 * Copyright 2019 Stanford University see LICENSE for license
 *
 * Minimal BIBFRAME Editor Node.js server. To run from the command-line:
 *  npm start  or node server.js
 */

import app from "./app"

const port = 8004

app.listen(port, () => {
  console.info(`Sinopia Linked Data Editor running on ${port}`)
  console.info("Press Ctrl + C to stop.")
})
