// Copyright 2026 Stanford University see LICENSE for license

import { FetchDocumentLoader } from "jsonld-context-parser"
import Config from "Config"
import bibframeContext from "../../static/contexts/bibframe-json-v0.1.json"

// Contexts the editor serves from its own bundle, so opening a record never
// depends on the cataloger's browser reaching another domain. See issue #255.
// v0.1 is frozen, so the bundled copy cannot drift.
const bundledContexts = {
  "https://bibframe-json.org/v0.1/context/bibframe.jsonld": bibframeContext,
}

// The API serves its own context for records stored without one. It is on the
// same host as the records themselves, so it is fetched rather than bundled.
const apiContextUrl = () => `${Config.sinopiaApiBase}/context.jsonld`

const fetchLoader = new FetchDocumentLoader((url, init) => fetch(url, init))

// Like bluecore-models, refuse any other remote context rather than fetch it.
export const documentLoader = {
  load: (url) => {
    if (bundledContexts[url]) return Promise.resolve(bundledContexts[url])
    if (url === apiContextUrl()) return fetchLoader.load(url)
    return Promise.reject(
      new Error(
        `Couldn't load the JSON-LD context ${url}: the editor only uses its bundled contexts and the API's own`,
      ),
    )
  },
}
