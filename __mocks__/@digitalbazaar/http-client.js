// Stub for @digitalbazaar/http-client used by jsonld's document loader.
// In tests, HTTP requests are mocked via fetch-mock-jest, so this module
// is never actually called. Stubbing it prevents undici (which requires
// many browser globals) from loading in the Jest jsdom environment.
module.exports = {
  HttpClient: class HttpClient {},
  httpClient: {},
}
