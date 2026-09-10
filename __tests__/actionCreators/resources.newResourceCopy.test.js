import { newResourceCopy } from "actionCreators/resources"
import mockConsole from "jest-mock-console"
import Config from "Config"
import { createState } from "stateUtils"
import { nanoid } from "nanoid"
import useEditorStore from "stores/editorStore"
import useEntitiesStore from "stores/entitiesStore"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

// This won't be required after Jest 27
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

afterEach(() => {
  useEditorStore.setState({
    errors: {},
    currentResource: undefined,
    currentComponent: {},
    unusedRDF: {},
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

afterAll(() => {
  jest.useRealTimers()
  restoreConsole()
})

// This forces Sinopia server to use fixtures
jest.spyOn(Config, "useResourceTemplateFixtures", "get").mockReturnValue(true)

describe("newResourceCopy", () => {
  describe("loading from existing resource", () => {
    it("dispatches actions", async () => {
      createState({ hasResourceWithLiteral: true })
      await newResourceCopy("t9zVwg2zO")

      // New subject was added to Zustand store
      const newSubject = useEntitiesStore.getState().subjects.abc0
      expect(newSubject).toBeTruthy()

      expect(useEditorStore.getState().unusedRDF.abc0).toBeNull()
      expect(useEditorStore.getState().currentResource).toBe("abc0")
      const currentComp = useEditorStore.getState().currentComponent.abc0
      expect(currentComp).toBeTruthy()
      expect(currentComp.component).toBeDefined()
      expect(currentComp.property).toBeDefined()
    })
  })

  describe("copying a resource with a nested resource", () => {
    it("does not copy the nested valueSubject", async () => {
      createState({ hasResourceWithNestedResource: true })
      await newResourceCopy("ljAblGiBW")

      // The copied resource should exist in Zustand
      const copiedResource = useEntitiesStore.getState().subjects.abc0
      expect(copiedResource).toBeTruthy()
    })
  })
})
