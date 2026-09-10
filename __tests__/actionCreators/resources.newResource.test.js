import { newResource } from "actionCreators/resources"
import mockConsole from "jest-mock-console"
import * as sinopiaApi from "sinopiaApi"
import Config from "Config"
import { createState } from "stateUtils"
import { nanoid } from "nanoid"
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
    currentModal: [],
    unusedRDF: {},
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

const resourceTemplateId = "resourceTemplate:testing:inputs"

describe("newResource", () => {
  sinopiaApi.putUserHistory = jest.fn().mockResolvedValue()

  describe("loading from resource template", () => {
    createState()

    it("dispatches actions", async () => {
      const keycloak = { token: "test-token" }
      const result = await newResource(
        resourceTemplateId,
        "testerrorkey",
        true,
        keycloak
      )
      expect(result).toBe("abc0")

      expect(useEditorStore.getState().unusedRDF.abc0).toBeNull()
      expect(useEditorStore.getState().currentResource).toBe("abc0")
      expect(useHistoryStore.getState().templates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: resourceTemplateId }),
        ])
      )
      const currentComp = useEditorStore.getState().currentComponent.abc0
      expect(currentComp).toBeTruthy()
      expect(currentComp.component).toBeDefined()
      expect(currentComp.property).toBeDefined()
      expect(sinopiaApi.putUserHistory).toHaveBeenCalledWith(
        "Foo McBar",
        "template",
        "e2bb9b57c5d91394dc6f7e1d32d7a97b",
        resourceTemplateId,
        keycloak
      )
    })
  })

  describe("loading from invalid resource template", () => {
    createState()

    it("dispatches actions", async () => {
      const result = await newResource(
        "rt:repeated:propertyURI:propertyLabel",
        "testerrorkey"
      )
      expect(result).toBe(false)

      expect(useEditorStore.getState().errors.testerrorkey).toContain(
        "A property template may not use the same property URI as another property template (http://id.loc.gov/ontologies/bibframe/geographicCoverage) unless both propery templates are of type nested resource and the nested resources are of different classes."
      )
    })
  })
})
