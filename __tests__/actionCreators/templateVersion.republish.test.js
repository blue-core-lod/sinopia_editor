import { newResourceFromDataset, loadResource } from "actionCreators/resources"
import { republishWithLatestTemplate } from "actionCreators/templateVersion"
import { setTemplateVersionCheck } from "actions/resources"
import * as sinopiaApi from "sinopiaApi"
import mockConsole from "jest-mock-console"
import Config from "Config"
import { createStore } from "testUtils"
import { datasetFromN3, datasetFromJsonld } from "utilities/Utilities"
import {
  selectCurrentResourceKey,
  selectNormSubject,
  selectTemplateVersionCheck,
} from "selectors/resources"
import { selectSubjectTemplateForSubject } from "selectors/templates"
import { selectErrors, displayResourceValidations } from "selectors/errors"
import { resourceEditErrorKey } from "utilities/errorKeyFactory"
import rdf from "rdf-ext"
import { nanoid } from "nanoid"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

jest.mock("nanoid")

// This forces Sinopia server to use fixtures.
jest.spyOn(Config, "useResourceTemplateFixtures", "get").mockReturnValue(true)

const realFetchResource = sinopiaApi.fetchResource

let restoreConsole = null
beforeEach(() => {
  let idCounter = 0
  nanoid.mockImplementation(() => `id${idCounter++}`)
  restoreConsole = mockConsole(["error", "debug"])
})

afterEach(() => {
  restoreConsole()
  jest.restoreAllMocks()
  jest.spyOn(Config, "useResourceTemplateFixtures", "get").mockReturnValue(true)
})

// See https://github.com/blue-core-lod/sinopia_editor/issues/210.
describe("re-publishing a resource with the latest template version", () => {
  const hasResourceTemplate = "http://sinopia.io/vocabulary/hasResourceTemplate"
  const profileUri =
    "https://bluecore-dev.stanford.edu/profiles/3db30d3a-7a3e-4762-a28c-1a0efc244345"
  // v1 has a main title only, v2 adds a subtitle, v3 requires the subtitle.
  const v1Uri = `${profileUri}/version/1`
  const v2Uri = `${profileUri}/version/2`
  const v3Uri = `${profileUri}/version/3`
  const uri = "http://localhost:3000/works/pinned-v1"
  const keycloak = {
    token: "test-token",
    updateToken: jest.fn().mockResolvedValue(false),
  }

  const n3 = `<${uri}> <${hasResourceTemplate}> <${v1Uri}> .
<${uri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Title> .
<${uri}> <http://id.loc.gov/ontologies/bibframe/mainTitle> "A title"@en .
`

  // The stored resource, as the API would return it.
  const stubStoredResource = ({ fails = false } = {}) =>
    jest
      .spyOn(sinopiaApi, "fetchResource")
      .mockImplementation((fetchUri, options) => {
        if (fetchUri !== uri) return realFetchResource(fetchUri, options)
        if (fails) return Promise.reject(new Error("Not found"))
        return datasetFromN3(n3).then((dataset) => [
          dataset,
          { group: "stanford", editGroups: [] },
        ])
      })

  // Captures the PUT to the resource uri. Everything else (history, search)
  // gets an empty success.
  const stubApi = ({ saveFails = false } = {}) => {
    const puts = []
    global.fetch = jest.fn((url, opts) => {
      if (url === uri && opts?.method === "PUT") {
        puts.push(opts.body)
        if (saveFails)
          return Promise.resolve({
            ok: false,
            statusText: "Internal Server Error",
            json: () => Promise.reject(new Error("no body")),
          })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
    return puts
  }

  // Opens the stored v1 resource and records that version targetUri is latest.
  const openPinnedToV1 = async (store, targetUri) => {
    const dataset = await datasetFromN3(n3)
    expect(
      await store.dispatch(
        newResourceFromDataset(dataset, uri, null, "testerror"),
      ),
    ).toBe(true)
    const resourceKey = selectCurrentResourceKey(store.getState())
    store.dispatch(
      setTemplateVersionCheck(resourceKey, {
        is_latest: false,
        compatible: true,
        current_version_uri: targetUri,
        resource_version_uri: v1Uri,
      }),
    )
    return resourceKey
  }

  const templateQuads = (body) => {
    const dataset = datasetFromJsonld(JSON.parse(JSON.parse(body).data))
    return dataset.then((ds) =>
      ds
        .match(rdf.namedNode(uri), rdf.namedNode(hasResourceTemplate))
        .toArray(),
    )
  }

  it("loadResource with resourceTemplateId opens v1 data against v2", async () => {
    stubStoredResource()
    stubApi()
    const store = createStore()

    const result = await store.dispatch(
      loadResource(uri, "testerror", { keycloak, resourceTemplateId: v2Uri }),
    )

    const subjectTemplate = selectSubjectTemplateForSubject(
      store.getState(),
      result[1].key,
    )
    expect(subjectTemplate.versionUri).toEqual(v2Uri)
  })

  it("re-publishes a v1 resource pinned to v2", async () => {
    stubStoredResource()
    const puts = stubApi()
    const store = createStore()
    const oldKey = await openPinnedToV1(store, v2Uri)

    expect(
      await store.dispatch(
        republishWithLatestTemplate(oldKey, "testerror", keycloak),
      ),
    ).toBe(true)

    expect(puts).toHaveLength(1)
    const quads = await templateQuads(puts[0])
    expect(quads).toHaveLength(1)
    expect(quads[0].object.termType).toEqual("NamedNode")
    expect(quads[0].object.value).toEqual(v2Uri)

    const state = store.getState()
    const newKey = selectCurrentResourceKey(state)
    expect(newKey).not.toEqual(oldKey)
    expect(state.editor.resources).toEqual([newKey])
    expect(selectTemplateVersionCheck(state, newKey).republished).toBe(true)
  })

  it("leaves the original open when the reload fails", async () => {
    const puts = stubApi()
    const store = createStore()
    const oldKey = await openPinnedToV1(store, v2Uri)
    stubStoredResource({ fails: true })

    expect(
      await store.dispatch(
        republishWithLatestTemplate(oldKey, "testerror", keycloak),
      ),
    ).toBe(false)

    expect(selectCurrentResourceKey(store.getState())).toEqual(oldKey)
    expect(puts).toHaveLength(0)
  })

  it("does not claim success when the save fails", async () => {
    stubStoredResource()
    const puts = stubApi({ saveFails: true })
    const store = createStore()
    const oldKey = await openPinnedToV1(store, v2Uri)

    expect(
      await store.dispatch(
        republishWithLatestTemplate(oldKey, "testerror", keycloak),
      ),
    ).toBe(false)

    expect(puts).toHaveLength(1)
    const state = store.getState()
    const newKey = selectCurrentResourceKey(state)
    expect(selectTemplateVersionCheck(state, newKey)?.republished).toBeFalsy()
    expect(selectErrors(state, resourceEditErrorKey(newKey))).toEqual([
      expect.stringMatching(/^Error saving:/),
    ])
  })

  it("does not re-check the template version during re-publish", async () => {
    // Fixtures mode resolves validateProfile to null, so the race itself can't
    // show up here. The spy is what catches it.
    const validateSpy = jest.spyOn(sinopiaApi, "validateProfile")
    stubStoredResource()
    stubApi()
    const store = createStore()
    const oldKey = await openPinnedToV1(store, v2Uri)

    await store.dispatch(
      republishWithLatestTemplate(oldKey, "testerror", keycloak),
    )

    expect(validateSpy).not.toHaveBeenCalled()
    const state = store.getState()
    expect(
      selectTemplateVersionCheck(state, selectCurrentResourceKey(state))
        .republished,
    ).toBe(true)
  })

  it("leaves the original open when the re-built resource has validation errors", async () => {
    stubStoredResource()
    const puts = stubApi()
    const store = createStore()
    const oldKey = await openPinnedToV1(store, v3Uri)
    const before = store.getState()
    const subjectsBefore = Object.keys(before.entities.subjects)

    expect(
      await store.dispatch(
        republishWithLatestTemplate(oldKey, "testerror", keycloak),
      ),
    ).toBe(false)

    expect(puts).toHaveLength(0)
    const state = store.getState()
    expect(selectCurrentResourceKey(state)).toEqual(oldKey)
    expect(state.editor.resources).toEqual([oldKey])
    expect(selectNormSubject(state, oldKey)).toBe(
      selectNormSubject(before, oldKey),
    )
    // The re-built resource is gone.
    expect(Object.keys(state.entities.subjects)).toEqual(subjectsBefore)
    expect(selectTemplateVersionCheck(state, oldKey).needsFields).toEqual([
      expect.objectContaining({ label: expect.stringContaining("Subtitle") }),
    ])
  })

  it("opens with the latest template without saving when told to skip validation", async () => {
    stubStoredResource()
    const puts = stubApi()
    const store = createStore()
    const oldKey = await openPinnedToV1(store, v3Uri)

    expect(
      await store.dispatch(
        republishWithLatestTemplate(oldKey, "testerror", keycloak, {
          skipValidation: true,
        }),
      ),
    ).toBe(false)

    expect(puts).toHaveLength(0)
    const state = store.getState()
    const newKey = selectCurrentResourceKey(state)
    expect(newKey).not.toEqual(oldKey)
    expect(state.editor.resources).toEqual([newKey])
    expect(selectSubjectTemplateForSubject(state, newKey).versionUri).toEqual(
      v3Uri,
    )
    expect(displayResourceValidations(state, newKey)).toBe(true)
    expect(selectTemplateVersionCheck(state, newKey)).toBeUndefined()
  })
})
