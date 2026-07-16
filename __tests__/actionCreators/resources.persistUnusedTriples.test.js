import { newResourceFromDataset, saveResource } from "actionCreators/resources"
import mockConsole from "jest-mock-console"
import Config from "Config"
import { createStore } from "testUtils"
import { datasetFromN3, datasetFromJsonld } from "utilities/Utilities"
import { selectCurrentResourceKey } from "selectors/resources"
import { nanoid } from "nanoid"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

jest.mock("nanoid")

// This forces Sinopia server to use fixtures.
jest.spyOn(Config, "useResourceTemplateFixtures", "get").mockReturnValue(true)

let restoreConsole = null
beforeEach(() => {
  // Unique ids so a real reducer-backed store doesn't collide keys.
  let idCounter = 0
  nanoid.mockImplementation(() => `id${idCounter++}`)
  restoreConsole = mockConsole(["error", "debug"])
})

afterEach(() => {
  restoreConsole()
})

// Regression test for https://github.com/blue-core-lod/sinopia_editor/issues/134
// A resource template shapes which triples are editable, but triples the
// template does not cover must not be stripped when the resource is saved.
describe("saveResource with triples not covered by the template", () => {
  const uri =
    "http://localhost:3000/resource/b6c5f4c0-e7cd-4ca5-a20f-2a37fe1080d6"

  // resourceTemplate:testing:inputs covers property1 (and others); it knows
  // nothing about property6x, so that triple lands in unusedRDF on load.
  const n3 = `<${uri}> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:inputs" .
<${uri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Inputs> .
<${uri}> <http://sinopia.io/testing/Inputs/property1> "A literal value"@en .
`
  const extraPredicate =
    "http://id.loc.gov/ontologies/bibframe/uber/template1/property6x"
  const extraTriple = `<${uri}> <${extraPredicate}> <ubertemplate1:property6> .`

  it("preserves the unused triples in the saved graph", async () => {
    const store = createStore()

    // Load the resource (with the extra triple) into real state.
    const dataset = await datasetFromN3(`${n3}${extraTriple}\n`)
    const loaded = await store.dispatch(
      newResourceFromDataset(dataset, uri, null, "testerror")
    )
    expect(loaded).toBe(true)

    const resourceKey = selectCurrentResourceKey(store.getState())

    // Capture the body PUT to the resource uri. Do not mock putResource, since
    // the real GraphBuilder / serialization path is what we are exercising.
    // Ancillary history/search fetches are absorbed by this same mock.
    let capturedBody = null
    global.fetch = jest.fn((url, opts) => {
      if (url === uri) capturedBody = opts.body
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    await store.dispatch(
      saveResource(resourceKey, "stanford", [], "testerror", {
        token: "test-token",
      })
    )

    expect(capturedBody).not.toBeNull()
    const { data } = JSON.parse(capturedBody)
    const savedDataset = await datasetFromJsonld(JSON.parse(data))

    // The unused triple must survive the round trip.
    expect(savedDataset.toCanonical()).toContain(extraPredicate)
  })
})
