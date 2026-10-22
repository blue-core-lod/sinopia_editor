import { newResourceFromDataset, saveResource } from "actionCreators/resources"
import mockConsole from "jest-mock-console"
import Config from "Config"
import { createStore } from "testUtils"
import { datasetFromJsonld } from "utilities/Utilities"
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

// Regression test for https://github.com/blue-core-lod/sinopia_editor/issues/240
// The API returns typed literals as JSON-LD native numbers ("@value": 0). A
// value of 0 must load as the literal "0", not as an empty value.
describe("loading a typed literal stored as a JSON-LD number", () => {
  const uri =
    "http://localhost:3000/resource/c1a4a7f2-4b0e-4c55-9d6e-6a0c1d6e2400"
  const integerProperty =
    "http://sinopia.io/testing/LiteralValidation/property3"
  const jsonld = {
    "@id": uri,
    "@type": ["http://sinopia.io/testing/LiteralValidation"],
    "http://sinopia.io/vocabulary/hasResourceTemplate": [
      { "@value": "resourceTemplate:testing:literalValidation" },
    ],
    [integerProperty]: [
      { "@type": "http://www.w3.org/2001/XMLSchema#integer", "@value": 0 },
    ],
  }

  it("loads 0 as the value and saves it back once", async () => {
    const store = createStore()

    const dataset = await datasetFromJsonld(jsonld)
    const loaded = await store.dispatch(
      newResourceFromDataset(dataset, uri, null, "testerror"),
    )
    expect(loaded).toBe(true)

    const literals = Object.values(store.getState().entities.values)
      .filter((value) => value.propertyUri === integerProperty)
      .map((value) => value.literal)
    expect(literals).toEqual(["0"])

    const resourceKey = selectCurrentResourceKey(store.getState())
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
    const savedDataset = await datasetFromJsonld(JSON.parse(data))
    const saved = savedDataset
      .match(null, null, null)
      .toArray()
      .filter((quad) => quad.predicate.value === integerProperty)
    expect(saved).toHaveLength(1)
    expect(saved[0].object.value).toBe("0")
    expect(saved[0].object.datatype.value).toBe(
      "http://www.w3.org/2001/XMLSchema#integer",
    )
  })

  // A typed 0 on a nested node (bflc:nonSortNum on a bf:Title in the report)
  // used to leave the title node behind as unused RDF, so a re-save sent a
  // second bf:title pointing at an empty blank node.
  it("saves a single title when a nested node holds a typed 0", async () => {
    const workUri =
      "http://localhost:3000/resource/0c6f9f1e-2d64-4a43-8f8e-2b7a5d0e2401"
    const bf = "http://id.loc.gov/ontologies/bibframe/"
    const store = createStore()

    const dataset = await datasetFromJsonld([
      {
        "@id": workUri,
        "@type": [`${bf}Work`],
        "http://sinopia.io/vocabulary/hasResourceTemplate": [
          { "@value": "resourceTemplate:bf2:Work" },
        ],
        [`${bf}title`]: [{ "@id": "_:title" }],
      },
      {
        "@id": "_:title",
        "@type": [`${bf}Title`],
        [`${bf}mainTitle`]: [{ "@value": "A title", "@language": "en" }],
        [`${bf}partNumber`]: [
          { "@type": "http://www.w3.org/2001/XMLSchema#integer", "@value": 0 },
        ],
      },
    ])
    const loaded = await store.dispatch(
      newResourceFromDataset(dataset, workUri, null, "testerror"),
    )
    expect(loaded).toBe(true)

    const resourceKey = selectCurrentResourceKey(store.getState())
    let capturedBody = null
    global.fetch = jest.fn((url, opts) => {
      if (url === workUri) capturedBody = opts.body
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
    const savedDataset = await datasetFromJsonld(JSON.parse(data))
    const titles = savedDataset
      .match(null, null, null)
      .toArray()
      .filter((quad) => quad.predicate.value === `${bf}title`)
    expect(titles).toHaveLength(1)
    const partNumbers = savedDataset
      .match(titles[0].object, null, null)
      .toArray()
      .filter((quad) => quad.predicate.value === `${bf}partNumber`)
    expect(partNumbers.map((quad) => quad.object.value)).toEqual(["0"])
  })
})

// Regression test for https://github.com/blue-core-lod/sinopia_editor/issues/240
// Two properties can share a predicate: the Monograph Work's "Work Title" and
// "Variant and/or Parallel Work Title" are both bf:title. The property whose
// templates do not match an object used to release that object's link quad as
// unused RDF even though its sibling had loaded it, so every save added a
// second link to an empty blank node.
describe("loading an object claimed by one of two properties sharing a predicate", () => {
  const uri =
    "http://localhost:3000/resource/5b0e3c61-8d3f-4f7e-a4a2-1c2b3d4e2402"
  const sharedProperty = "http://sinopia.io/testing/DupeProperties/property1"

  it("saves the link once and reports no unused RDF", async () => {
    const store = createStore()

    // resourceTemplate:testing:dupeProperties has property1 twice: one takes
    // bf:TitleNote, the other bf:Note. This object only matches the second.
    const dataset = await datasetFromJsonld([
      {
        "@id": uri,
        "@type": ["http://sinopia.io/testing/DupeProperties"],
        "http://sinopia.io/vocabulary/hasResourceTemplate": [
          { "@value": "resourceTemplate:testing:dupeProperties" },
        ],
        [sharedProperty]: [{ "@id": "_:note" }],
      },
      {
        "@id": "_:note",
        "@type": ["http://id.loc.gov/ontologies/bibframe/Note"],
        "http://www.w3.org/2000/01/rdf-schema#label": [
          { "@value": "A note", "@language": "en" },
        ],
      },
    ])
    const loaded = await store.dispatch(
      newResourceFromDataset(dataset, uri, null, "testerror"),
    )
    expect(loaded).toBe(true)

    const resourceKey = selectCurrentResourceKey(store.getState())
    expect(store.getState().editor.unusedRDF[resourceKey]).toBeNull()

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
    const savedDataset = await datasetFromJsonld(JSON.parse(data))
    const links = savedDataset
      .match(null, null, null)
      .toArray()
      .filter((quad) => quad.predicate.value === sharedProperty)
    expect(links).toHaveLength(1)
    expect(savedDataset.match(links[0].object).size).toBeGreaterThan(0)
  })
})
