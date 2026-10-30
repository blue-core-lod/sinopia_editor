import {
  newResourceFromDataset,
  newResourceCopy,
} from "actionCreators/resources"
import mockConsole from "jest-mock-console"
import Config from "Config"
import { createStore } from "testUtils"
import { datasetFromJsonld } from "utilities/Utilities"
import { selectCurrentResourceKey } from "selectors/resources"
import { nanoid } from "nanoid"
import instanceWithRefs from "../__resource_fixtures__/instance_with_refs.json"

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

const uri =
  "http://localhost:3000/resource/a5c5f4c0-e7cd-4ca5-a20f-2a37fe1080d5"
const workUri =
  "http://localhost:3000/resource/f6ee6410-5206-492b-8e48-3b6333010c33"
const instanceOf = "http://id.loc.gov/ontologies/bibframe/instanceOf"

const instanceOfPropertyFor = (state, resourceKey) =>
  state.entities.subjects[resourceKey].propertyKeys
    .map((propertyKey) => state.entities.properties[propertyKey])
    .find((property) =>
      Object.keys(
        state.entities.propertyTemplates[property.propertyTemplateKey].uris,
      ).includes(instanceOf),
    )

const valueUrisFor = (state, resourceKey) =>
  Object.values(state.entities.values)
    .filter((value) => value.rootSubjectKey === resourceKey)
    .map((value) => value.uri)

// Regression tests for https://github.com/blue-core-lod/sinopia_editor/issues/236
// A copy does not keep the original's Work-Instance links (#156), but it must
// still offer the template's "Instance of" property so one can be entered.
describe("copying an Instance linked to a Work", () => {
  it("keeps Instance of, without its value, when copied from the API", async () => {
    const store = createStore()
    const dataset = await datasetFromJsonld(instanceWithRefs)

    await store.dispatch(
      newResourceFromDataset(dataset, uri, null, "testerror", true),
    )

    const state = store.getState()
    const resourceKey = selectCurrentResourceKey(state)
    const property = instanceOfPropertyFor(state, resourceKey)
    expect(property).toBeDefined()
    expect(property.valueKeys).toBeNull()
    expect(property.show).toBe(false)
    expect(valueUrisFor(state, resourceKey)).not.toContain(workUri)
  })

  it("keeps Instance of, without its value, when copied in the editor", async () => {
    const store = createStore()
    const dataset = await datasetFromJsonld(instanceWithRefs)

    await store.dispatch(
      newResourceFromDataset(dataset, uri, null, "testerror"),
    )
    const originalKey = selectCurrentResourceKey(store.getState())
    expect(
      instanceOfPropertyFor(store.getState(), originalKey).valueKeys,
    ).toHaveLength(1)

    await store.dispatch(newResourceCopy(originalKey))

    const state = store.getState()
    const copyKey = selectCurrentResourceKey(state)
    expect(copyKey).not.toEqual(originalKey)
    const property = instanceOfPropertyFor(state, copyKey)
    expect(property).toBeDefined()
    expect(property.valueKeys).toBeNull()
    expect(property.show).toBe(false)
    expect(valueUrisFor(state, copyKey)).not.toContain(workUri)
  })
})
