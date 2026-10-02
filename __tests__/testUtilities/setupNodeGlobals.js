// Polyfill Node.js globals not available in Jest's jsdom VM context.
// Required for rdf-canonize@5.x and undici (used by @digitalbazaar/http-client
// via jsonld@9.x via @rdfjs/serializer-jsonld-ext@4.x).
const { setImmediate, clearImmediate } = require("timers")
const { TextEncoder, TextDecoder } = require("util")
const nodeCrypto = require("node:crypto")
const {
  ReadableStream,
  WritableStream,
  TransformStream,
} = require("node:stream/web")

global.setImmediate = setImmediate
global.clearImmediate = clearImmediate
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
global.crypto = nodeCrypto.webcrypto

/*
 * jest-environment-jsdom does not expose the WHATWG Streams API. fetch-mock@12
 * (via @fetch-mock/jest) builds real Response objects whose body is a
 * ReadableStream, so without these any resp.json()/resp.text() on a mocked
 * response throws "ReadableStream is not defined" — which sinopiaApi.js then
 * relabels as "Error parsing resource".
 */
global.ReadableStream = ReadableStream
global.WritableStream = WritableStream
global.TransformStream = TransformStream

// Provide the window._env_ object that Config.js reads at runtime.
// In the browser this is populated by the /env-config.js endpoint.
window._env_ = {}
