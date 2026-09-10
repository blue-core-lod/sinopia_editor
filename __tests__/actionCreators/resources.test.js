import {
  expandProperty,
  addSiblingValueSubject,
  resetValueSubject,
  saveNewResource,
  saveResource,
  contractProperty,
  addMainTitle,
} from "actionCreators/resources"
import mockConsole from "jest-mock-console"
import * as sinopiaApi from "sinopiaApi"
import * as sinopiaSearch from "sinopiaSearch"
import Config from "Config"
import configureMockStore from "redux-mock-store"
import thunk from "redux-thunk"
import { createState } from "stateUtils"
import { nanoid } from "nanoid"
import useEditorStore from "stores/editorStore"
import useEntitiesStore from "stores/entitiesStore"
import useAuthenticateStore from "stores/authenticateStore"
import useHistoryStore from "stores/historyStore"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

jest.useFakeTimers({ now: new Date("2020-08-20T11:34:40.887Z") })
jest.mock("nanoid")

// Support mocking/restoring the `console` object
let restoreConsole = null
beforeEach(() => {
  nanoid.mockImplementation(() => "abc123")
  // Capture and not display console output
  restoreConsole = mockConsole(["error", "debug"])
  useAuthenticateStore.setState({
    user: { username: "Foo McBar", groups: ["stanford", "pcc"] },
  })
})

afterEach(() => {
  useAuthenticateStore.setState({ user: undefined })
  useHistoryStore.setState({ templates: [], searches: [], resources: [] })
})

afterAll(() => {
  jest.useRealTimers()
  restoreConsole()
})

// This forces Sinopia server to use fixtures
jest.spyOn(Config, "useResourceTemplateFixtures", "get").mockReturnValue(true)

const mockStore = configureMockStore([thunk])

describe("expandProperty", () => {
  describe("expand a nested resource", () => {
    it("dispatches actions", async () => {
      const store = mockStore(
        createState({ hasResourceWithContractedNestedResource: true })
      )
      await store.dispatch(expandProperty("v1o90QO1Qx", "testerrorkey"))

      // Property should now be shown in Zustand state
      const property = useEntitiesStore.getState().properties.v1o90QO1Qx
      expect(property).toBeTruthy()
      expect(property.show).toBe(true)
    })
  })

  describe("expand a literal", () => {
    it("dispatches actions", async () => {
      const store = mockStore(
        createState({ hasResourceWithContractedLiteral: true })
      )
      await store.dispatch(expandProperty("JQEtq-vmq8", "testerrorkey"))

      // Property should now be shown in Zustand state
      const property = useEntitiesStore.getState().properties["JQEtq-vmq8"]
      expect(property).toBeTruthy()
      expect(property.show).toBe(true)
    })
  })
})

describe("addSiblingValueSubject", () => {
  it("dispatches actions", async () => {
    const store = mockStore(
      createState({ hasResourceWithNestedResource: true })
    )
    await store.dispatch(addSiblingValueSubject("VDOeQCnFA8", "testerrorkey"))

    // Should have added a new value to the property
    const property = useEntitiesStore.getState().properties.v1o90QO1Qx
    expect(property.valueKeys.length).toBeGreaterThan(1)
  })
})

describe("resetValueSubject", () => {
  it("dispatches ADD_VALUE then REMOVE_VALUE", async () => {
    const store = mockStore(
      createState({ hasResourceWithNestedResource: true })
    )
    await store.dispatch(resetValueSubject("VDOeQCnFA8", "testerrorkey"))

    // Original value should be removed from Zustand
    const value = useEntitiesStore.getState().values.VDOeQCnFA8
    expect(value).toBeUndefined()
  })
})

describe("saveNewResource", () => {
  const uri = "http://localhost:3000/resource/abcdeghij23455"
  sinopiaApi.putUserHistory = jest.fn().mockResolvedValue()
  sinopiaSearch.getSearchResultsByUris = jest
    .fn()
    .mockResolvedValue({ results: [] })

  it("saves a new resource", async () => {
    const store = mockStore(createState({ hasResourceWithLiteral: true }))
    sinopiaApi.postResource = jest.fn().mockResolvedValue(uri)
    const keycloak = { token: "test-token" }

    await store.dispatch(
      saveNewResource(
        "t9zVwg2zO",
        "stanford",
        ["cornell"],
        "testerror",
        keycloak
      )
    )

    expect(useEditorStore.getState().errors.testerror).toEqual([])
    // Base URL was set in Zustand
    expect(useEntitiesStore.getState().subjects.t9zVwg2zO.uri).toEqual(uri)
    expect(useEditorStore.getState().lastSave.t9zVwg2zO).toBeTruthy()
    expect(useHistoryStore.getState().resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uri,
          modified: "2020-08-20T11:34:40.887Z",
          group: "stanford",
          type: ["http://id.loc.gov/ontologies/bibframe/AbbreviatedTitle"],
        }),
      ])
    )
    // Resource group was set in Zustand
    const subject = useEntitiesStore.getState().subjects.t9zVwg2zO
    expect(subject.group).toEqual("stanford")
    expect(subject.editGroups).toEqual(["cornell"])

    expect(sinopiaApi.putUserHistory).toHaveBeenCalledWith(
      "Foo McBar",
      "resource",
      "bf59d4921535b8f951f1db52584c6d6e",
      "http://localhost:3000/resource/abcdeghij23455",
      keycloak
    )
  })

  it("error when saving a new resource", async () => {
    const store = mockStore(createState({ hasResourceWithLiteral: true }))
    sinopiaApi.postResource.mockRejectedValue(new Error("Messed-up"))

    await store.dispatch(
      saveNewResource("t9zVwg2zO", "stanford", ["cornell"], "testerror")
    )

    expect(useEditorStore.getState().errors.testerror).toContain(
      "Error saving new resource: Messed-up"
    )
  })
})

describe("saveResource", () => {
  sinopiaApi.putUserHistory = jest.fn().mockResolvedValue()
  sinopiaSearch.getSearchResultsByUris = jest
    .fn()
    .mockResolvedValue({ results: [] })

  it("saves an existing resource", async () => {
    sinopiaApi.putResource = jest.fn().mockResolvedValue("t9zVwg2zO")
    const state = createState({ hasResourceWithLiteral: true })
    // Update Zustand directly with group
    useEntitiesStore.setState({
      subjects: {
        ...useEntitiesStore.getState().subjects,
        t9zVwg2zO: {
          ...useEntitiesStore.getState().subjects.t9zVwg2zO,
          group: "stanford",
        },
      },
    })
    const store = mockStore(state)
    const keycloak = { token: "test-token" }

    await store.dispatch(
      saveResource("t9zVwg2zO", "stanford", ["cornell"], "testerror", keycloak)
    )

    expect(useEditorStore.getState().errors.testerror).toEqual([])
    expect(useEditorStore.getState().lastSave.t9zVwg2zO).toBeTruthy()
    expect(useHistoryStore.getState().resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uri: "https://api.sinopia.io/resource/0894a8b3",
          type: ["http://id.loc.gov/ontologies/bibframe/AbbreviatedTitle"],
          group: "stanford",
          modified: "2020-08-20T11:34:40.887Z",
        }),
      ])
    )
    // Resource group was set in Zustand
    const subject = useEntitiesStore.getState().subjects.t9zVwg2zO
    expect(subject.group).toEqual("stanford")
    expect(subject.editGroups).toEqual(["cornell"])

    expect(sinopiaApi.putUserHistory).toHaveBeenCalledWith(
      "Foo McBar",
      "resource",
      "3eb9f1444e9ec984fb165fc9c4de826a",
      "https://api.sinopia.io/resource/0894a8b3",
      keycloak
    )
  })

  it("error when trying to save existing resource", async () => {
    sinopiaApi.putResource = jest.fn().mockRejectedValue(new Error("Messed-up"))
    const store = mockStore(createState({ hasResourceWithLiteral: true }))
    await store.dispatch(
      saveResource("t9zVwg2zO", "stanford", ["cornell"], "testerror")
    )
    expect(useEditorStore.getState().errors.testerror).toContain(
      "Error saving: Messed-up"
    )
  })
})

describe("contractProperty", () => {
  it("removes a property values from state", async () => {
    const store = mockStore(createState({ hasResourceWithLiteral: true }))
    await store.dispatch(contractProperty("JQEtq-vmq8"))
    // Property values should be null in Zustand
    const property = useEntitiesStore.getState().properties["JQEtq-vmq8"]
    expect(property.valueKeys).toBeNull()
  })
})

describe("addMainTitle", () => {
  it("add title value to state", async () => {
    const store = mockStore(createState({ hasResourceWithMainTitle: true }))
    await store.dispatch(
      addMainTitle("cqxLskA9kjAfMFDeuvzGq", {
        literal: "Tang",
        lang: "en",
        propertyUri: "http://id.loc.gov/ontologies/bibframe/mainTitle",
      })
    )
    // Check Zustand state for updated value
    const value = useEntitiesStore.getState().values.JjUhYxaBo9nuIh8GKd9k5
    expect(value.literal).toEqual("Tang")
    expect(value.lang).toEqual("en")
  })
})
