import { newResourceFromDataset, saveResource } from "actionCreators/resources"
import mockConsole from "jest-mock-console"
import Config from "Config"
import { createStore } from "testUtils"
import { datasetFromN3, datasetFromJsonld } from "utilities/Utilities"
import { selectCurrentResourceKey } from "selectors/resources"
import { selectSubjectTemplateForSubject } from "selectors/templates"
import { selectUnusedRDF } from "selectors/modals"
import { selectErrors } from "selectors/errors"
import rdf from "rdf-ext"
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

// See https://github.com/blue-core-lod/sinopia_editor/issues/190. A resource
// records the profile version it was edited with, and keeps opening against
// that version after the profile moves on.
describe("resources pinned to a profile version", () => {
  const hasResourceTemplate = "http://sinopia.io/vocabulary/hasResourceTemplate"
  const profileUri =
    "https://bluecore-dev.stanford.edu/profiles/3db30d3a-7a3e-4762-a28c-1a0efc244345"
  // v1 has a main title only; v2, the profile as it is today, adds a subtitle.
  const v1Uri = `${profileUri}/version/1`
  const v2Uri = `${profileUri}/version/2`

  const n3For = (uri, templateTerm) =>
    `<${uri}> <${hasResourceTemplate}> ${templateTerm} .
<${uri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Title> .
<${uri}> <http://id.loc.gov/ontologies/bibframe/mainTitle> "A title"@en .
`

  const load = async (store, uri, templateTerm) => {
    const dataset = await datasetFromN3(n3For(uri, templateTerm))
    expect(
      await store.dispatch(
        newResourceFromDataset(dataset, uri, null, "testerror"),
      ),
    ).toBe(true)
    return selectCurrentResourceKey(store.getState())
  }

  const templateFor = (store, resourceKey) =>
    selectSubjectTemplateForSubject(store.getState(), resourceKey)

  // Saves through the real GraphBuilder / serialization path and returns the
  // dataset PUT to the resource uri.
  const save = async (store, resourceKey, uri) => {
    let capturedBody = null
    global.fetch = jest.fn((url, opts) => {
      if (url === uri) capturedBody = opts.body
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    await store.dispatch(
      saveResource(resourceKey, "stanford", [], "testerror", {
        token: "test-token",
        updateToken: jest.fn().mockResolvedValue(false),
      }),
    )

    expect(capturedBody).not.toBeNull()
    const { data } = JSON.parse(capturedBody)
    return datasetFromJsonld(JSON.parse(data))
  }

  const templateQuads = (dataset, uri) =>
    dataset
      .match(rdf.namedNode(uri), rdf.namedNode(hasResourceTemplate))
      .toArray()

  it("opens against the pinned version, not the latest", async () => {
    const store = createStore()
    const resourceKey = await load(
      store,
      "http://localhost:3000/works/pinned-v1",
      `<${v1Uri}>`,
    )

    const subjectTemplate = templateFor(store, resourceKey)
    expect(subjectTemplate.versionUri).toEqual(v1Uri)
    expect(subjectTemplate.label).toEqual("Versioned Title v1")
    // v2's subtitle property is not part of the v1 tree.
    expect(subjectTemplate.propertyTemplateKeys).toHaveLength(1)
  })

  it("opens two versions of one profile side by side", async () => {
    const store = createStore()
    const v1Key = await load(
      store,
      "http://localhost:3000/works/pinned-v1",
      `<${v1Uri}>`,
    )
    const v2Key = await load(
      store,
      "http://localhost:3000/works/pinned-v2",
      `<${v2Uri}>`,
    )

    expect(templateFor(store, v1Key).label).toEqual("Versioned Title v1")
    expect(templateFor(store, v1Key).propertyTemplateKeys).toHaveLength(1)
    expect(templateFor(store, v2Key).label).toEqual("Versioned Title v2")
    expect(templateFor(store, v2Key).propertyTemplateKeys).toHaveLength(2)
  })

  it("round-trips the pin: one named node, not unused RDF", async () => {
    const store = createStore()
    const uri = "http://localhost:3000/works/pinned-v1"
    const resourceKey = await load(store, uri, `<${v1Uri}>`)

    // Consumed on load rather than parked as unused RDF.
    expect(selectUnusedRDF(store.getState(), resourceKey)).toBeFalsy()

    const saved = await save(store, resourceKey, uri)

    // Re-saving keeps the version the resource was edited against.
    const quads = templateQuads(saved, uri)
    expect(quads).toHaveLength(1)
    expect(quads[0].object.termType).toEqual("NamedNode")
    expect(quads[0].object.value).toEqual(v1Uri)
  })

  it("still opens a resource carrying a legacy literal template id", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {})
    const store = createStore()
    const uri = "http://localhost:3000/works/legacy"
    const resourceKey = await load(
      store,
      uri,
      '"bluecore:bf2:Title:VersionedTitle"',
    )

    expect(templateFor(store, resourceKey).id).toEqual(
      "bluecore:bf2:Title:VersionedTitle",
    )
    expect(selectUnusedRDF(store.getState(), resourceKey)).toBeFalsy()
    expect(selectErrors(store.getState(), "testerror")).toBeFalsy()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()

    // And its round trip is clean too.
    const saved = await save(store, resourceKey, uri)
    expect(templateQuads(saved, uri)).toHaveLength(1)
  })
})
