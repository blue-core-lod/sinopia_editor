// Polyfill Node.js globals not available in Jest's jsdom VM context.
// Required for rdf-canonize@5.x and undici (used by @digitalbazaar/http-client
// via jsonld@9.x via @rdfjs/serializer-jsonld-ext@4.x).
const { setImmediate, clearImmediate } = require("timers")
const { TextEncoder, TextDecoder } = require("util")
const nodeCrypto = require("node:crypto")

global.setImmediate = setImmediate
global.clearImmediate = clearImmediate
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
global.crypto = nodeCrypto.webcrypto
