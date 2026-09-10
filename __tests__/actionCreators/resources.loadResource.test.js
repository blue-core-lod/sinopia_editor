import {
  loadResourceForEditor,
  loadResourceForPreview,
  loadResourceForDiff,
} from "actionCreators/resources"
import mockConsole from "jest-mock-console"
import * as sinopiaApi from "sinopiaApi"
import * as sinopiaSearch from "sinopiaSearch"
import Config from "Config"
import { createState } from "stateUtils"
import { nanoid } from "nanoid"
import * as relationshipActionCreators from "actionCreators/relationships"
import useHistoryStore from "stores/historyStore"
import useEditorStore from "stores/editorStore"
import useEntitiesStore from "stores/entitiesStore"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

jest.useFakeTimers({ now: new Date("2020-08-20T11:34:40.887Z") })
jest.mock("nanoid")

// Support mocking/restoring the `console` object
let restoreConsole = null
beforeEach(() => {
  let nanoidCounter = 0
  nanoid.mockImplementation(() => `abc${nanoidCounter++}`)
  // Capture and not display console output
  restoreConsole = mockConsole(["error", "debug"])
})

afterAll(() => {
  jest.useRealTimers()
  restoreConsole()
})

afterEach(() => {
  useHistoryStore.setState({ templates: [], searches: [], resources: [] })
  useEditorStore.setState({
    errors: {},
    successes: {},
    currentResource: undefined,
    currentPreviewResource: undefined,
    currentDiff: { compareFrom: undefined, compareTo: undefined },
    currentModal: [],
    unusedRDF: {},
    pendingResourceTemplateSelection: null,
    currentComponent: {},
  })
  useEntitiesStore.setState({
    subjects: {},
    properties: {},
    values: {},
    subjectTemplates: {},
    propertyTemplates: {},
    versions: {},
    relationships: {},
  })
})

// This forces Sinopia server to use fixtures
jest.spyOn(Config, "useResourceTemplateFixtures", "get").mockReturnValue(true)

const uri =
  "http://localhost:3000/resource/b6c5f4c0-e7cd-4ca5-a20f-2a37fe1080d6"

describe("loadResource", () => {
  describe("loading a resource for editor", () => {
    createState()
    sinopiaApi.putUserHistory = jest.fn().mockResolvedValue()
    sinopiaSearch.getSearchResultsByUris = jest
      .fn()
      .mockResolvedValue({ results: [] })
    jest.spyOn(relationshipActionCreators, "loadRelationships")

    it("dispatches actions", async () => {
      const keycloak = { token: "test-token" }
      const result = await loadResourceForEditor(
        uri,
        "testerrorkey",
        {},
        keycloak
      )
      expect(result).toBe(true)

      expect(useEditorStore.getState().errors.testerrorkey || []).toHaveLength(
        0
      )
      expect(useEditorStore.getState().unusedRDF.abc0).toBeNull()
      expect(useEditorStore.getState().currentResource).toBe("abc0")
      expect(useHistoryStore.getState().resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            uri,
            type: ["http://sinopia.io/testing/Inputs"],
            group: "stanford",
            modified: "2020-08-20T11:34:40.887Z",
          }),
        ])
      )

      expect(sinopiaApi.putUserHistory).toHaveBeenCalledWith(
        "Foo McBar",
        "resource",
        "87d27b05d48874c9f80cd4b7e8fc0dcc",
        uri,
        keycloak
      )

      // loadRelationships is invoked async and do not wait for results
      expect(relationshipActionCreators.loadRelationships).toHaveBeenCalledWith(
        "abc0",
        uri,
        "testerrorkey"
      )
    })
  })

  describe("loading a new resource", () => {
    createState()

    it("dispatches actions", async () => {
      const result = await loadResourceForEditor(uri, "testerrorkey", {
        asNewResource: true,
      })
      expect(result).toBe(true)

      expect(useEditorStore.getState().errors.testerrorkey || []).toHaveLength(
        0
      )
      expect(useEditorStore.getState().unusedRDF.abc0).toBeNull()
      expect(useEditorStore.getState().currentResource).toBe("abc0")
      const currentComp = useEditorStore.getState().currentComponent.abc0
      expect(currentComp).toBeTruthy()
      expect(currentComp.component).toBeDefined()
      expect(currentComp.property).toBeDefined()
    })
  })

  describe("loading a resource for preview", () => {
    createState()

    it("dispatches actions", async () => {
      const result = await loadResourceForPreview(uri, "testerrorkey")
      expect(result).toBe(true)

      expect(useEditorStore.getState().errors.testerrorkey || []).toHaveLength(
        0
      )
      expect(useEditorStore.getState().unusedRDF.abc0).toBeNull()
      expect(useEditorStore.getState().currentPreviewResource).toBe("abc0")
    })
  })

  describe("loading a resource for diff", () => {
    createState()

    it("dispatches actions", async () => {
      const result = await loadResourceForDiff(
        uri,
        "testerrorkey",
        "compareFromResourceKey",
        {
          version: "2019-10-16T17:13:45.084Z",
        }
      )
      expect(result).toBe(true)

      expect(useEditorStore.getState().errors.testerrorkey || []).toHaveLength(
        0
      )
      expect(useEditorStore.getState().unusedRDF.abc0).toBeNull()
      expect(useEditorStore.getState().currentDiff.compareFrom).toBe("abc0")
    })
  })

  describe("loading an invalid resource", () => {
    createState()

    it("dispatches actions", async () => {
      const uri =
        "http://localhost:3000/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3f-invalid"
      const result = await loadResourceForEditor(uri, "testerrorkey")
      expect(result).toBe(false)

      expect(useEditorStore.getState().errors.testerrorkey).toContain(
        "A property template may not use the same property URI as another property template (http://id.loc.gov/ontologies/bibframe/geographicCoverage) unless both propery templates are of type nested resource and the nested resources are of different classes."
      )
    })
  })

  describe("loading a resource without a resource template", () => {
    createState()

    it("dispatches actions", async () => {
      const uri =
        "http://localhost:3000/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3f-invalid-template"
      const result = await loadResourceForEditor(uri, "testerrorkey")
      expect(result).toBe(false)

      expect(useEditorStore.getState().currentModal).toContain(
        "ResourceTemplateChoiceModal"
      )
    })
  })

  describe("load error", () => {
    createState()

    it("dispatches actions", async () => {
      // http://error is a special URI that will cause an error to be thrown.
      const result = await loadResourceForEditor("http://error", "testerrorkey")
      expect(result).toBe(false)

      expect(useEditorStore.getState().errors.testerrorkey).toContain(
        "Error retrieving http://error: Error parsing resource: Ooops"
      )
    })
  })

  describe("loading a resource with multiple property uris", () => {
    const uri =
      "http://localhost:3000/resource/c7c5f4c0-e7cd-4ca5-a20f-2a37fe1080d7"
    createState()
    sinopiaApi.putUserHistory = jest.fn().mockResolvedValue()
    sinopiaSearch.getSearchResultsByUris = jest
      .fn()
      .mockResolvedValue({ results: [] })
    jest.spyOn(relationshipActionCreators, "loadRelationships")

    it("dispatches actions", async () => {
      const result = await loadResourceForEditor(uri, "testerrorkey")
      expect(result).toBe(true)
    })
  })
})
