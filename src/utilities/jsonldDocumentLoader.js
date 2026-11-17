// Copyright 2026 Stanford University see LICENSE for license

import { FetchDocumentLoader } from "jsonld-context-parser"
import bibframeContext from "../../static/contexts/bibframe-json-v0.1.json"

// Contexts the editor serves from its own bundle, so opening a record never
// depends on the cataloger's browser reaching another domain. See issue #255.
// v0.1 is frozen, so the bundled copy cannot drift.
const bundledContexts = {
  "https://bibframe-json.org/v0.1/context/bibframe.jsonld": bibframeContext,
}

const fetchLoader = new FetchDocumentLoader((url, init) => fetch(url, init))

// Any other context (the API's own, or one named in RDF a cataloger pastes into
// Load RDF) is fetched as before. If that fails, the parser prefixes the error
// with "Failed to load remote context <url>: ".
export const documentLoader = {
  load: (url) =>
    bundledContexts[url]
      ? Promise.resolve(bundledContexts[url])
      : fetchLoader.load(url),
}
