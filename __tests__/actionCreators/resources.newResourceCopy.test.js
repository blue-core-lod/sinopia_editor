import { newResourceCopy } from "actionCreators/resources"
import mockConsole from "jest-mock-console"
import Config from "Config"
import configureMockStore from "redux-mock-store"
import thunk from "redux-thunk"
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
  nanoid.mockImplementation(() => "abc123")
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
})

afterAll(() => {
  jest.useRealTimers()
  restoreConsole()
})

// This forces Sinopia server to use fixtures
jest.spyOn(Config, "useResourceTemplateFixtures", "get").mockReturnValue(true)

const mockStore = configureMockStore([thunk])

describe("newResourceCopy", () => {
  describe("loading from existing resource", () => {
    it("dispatches actions", async () => {
      const store = mockStore(createState({ hasResourceWithLiteral: true }))
      await store.dispatch(newResourceCopy("t9zVwg2zO"))

      // New subject was added to Zustand store
      const newSubject = useEntitiesStore.getState().subjects.abc123
      expect(newSubject).toBeTruthy()

      expect(useEditorStore.getState().unusedRDF.abc123).toBeNull()
      expect(useEditorStore.getState().currentResource).toBe("abc123")
      expect(useEditorStore.getState().currentComponent.abc123).toEqual({
        component: "abc123",
        property: "abc123",
      })
    })
  })

  describe("copying a resource with a nested resource", () => {
    it("does not copy the nested valueSubject", async () => {
      const store = mockStore(
        createState({ hasResourceWithNestedResource: true })
      )
      await store.dispatch(newResourceCopy("ljAblGiBW"))

      // The copied resource should exist in Zustand
      const copiedResource = useEntitiesStore.getState().subjects.abc123
      expect(copiedResource).toBeTruthy()
    })
  })
})
