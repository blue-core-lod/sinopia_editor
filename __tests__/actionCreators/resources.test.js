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
import { thunk } from "redux-thunk"
import { createState } from "stateUtils"
import { nanoid } from "nanoid"
import { safeAction } from "actionUtils"
import StateResourceBuilder from "stateResourceBuilderUtils"
import expectedExpandPropertyAddValueAction from "../__action_fixtures__/expandProperty-ADD_VALUE"
import expectedExpandPropertyAddPropertyAction from "../__action_fixtures__/expandProperty-ADD_PROPERTY"
import expectedAddSiblingAddValueAction from "../__action_fixtures__/addSiblingValueSubject-ADD_VALUE"

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
})

afterAll(() => {
  jest.useRealTimers()
  restoreConsole()
})

// This forces Sinopia server to use fixtures
jest.spyOn(Config, "useResourceTemplateFixtures", "get").mockReturnValue(true)

const mockStore = configureMockStore([thunk])

const build = new StateResourceBuilder()

// The template fixture with the template's own id filled in, so that saving
// it can record the template in the user's history.
const createTemplateState = () => {
  const state = createState({ hasTemplateWithLiteral: true })
  const propertyTemplate = build.propertyTemplate({
    subjectTemplateKey: "sinopia:template:resource",
    label: "Template ID",
    uris: { "http://sinopia.io/vocabulary/hasResourceId": "Template ID" },
    type: "literal",
    component: "InputLiteral",
  })
  state.entities.subjectTemplates[
    "sinopia:template:resource"
  ].propertyTemplateKeys.push(propertyTemplate.key)
  state.entities.propertyTemplates[propertyTemplate.key] = propertyTemplate
  state.entities.subjects["8VrbxGPeF"].propertyKeys.push("rTiDpRoP01")
  state.entities.properties.rTiDpRoP01 = build.property({
    key: "rTiDpRoP01",
    subjectKey: "8VrbxGPeF",
    propertyTemplateKey: propertyTemplate.key,
    valueKeys: ["rTiDvAlU01"],
    labels: ["Resource Template", "Template ID"],
  })
  state.entities.values.rTiDvAlU01 = build.literalValue({
    key: "rTiDvAlU01",
    literal: "test:template:id",
    lang: null,
    rootSubjectKey: "8VrbxGPeF",
    propertyKey: "rTiDpRoP01",
    propertyUri: "http://sinopia.io/vocabulary/hasResourceId",
  })
  return state
}

describe("expandProperty", () => {
  describe("expand a nested resource", () => {
    // const expectedAddValueAction = require("../__action_fixtures__/expandProperty-ADD_VALUE.json")
    const store = mockStore(
      createState({ hasResourceWithContractedNestedResource: true }),
    )

    it("dispatches actions", async () => {
      await store.dispatch(expandProperty("v1o90QO1Qx", "testerrorkey"))

      const actions = store.getActions()

      const addValueAction = actions.find(
        (action) => action.type === "ADD_VALUE",
      )

      expect(safeAction(addValueAction)).toEqual(
        expectedExpandPropertyAddValueAction,
      )

      expect(actions).toHaveAction("ADD_TEMPLATES")
      expect(actions).toHaveAction("SHOW_PROPERTY", "v1o90QO1Qx")
    })
  })

  describe("expand a literal", () => {
    const store = mockStore(
      createState({ hasResourceWithContractedLiteral: true }),
    )

    it("dispatches actions", async () => {
      await store.dispatch(expandProperty("JQEtq-vmq8", "testerrorkey"))

      const actions = store.getActions()

      const addPropertyAction = actions.find(
        (action) => action.type === "ADD_PROPERTY",
      )

      expect(safeAction(addPropertyAction)).toEqual(
        expectedExpandPropertyAddPropertyAction,
      )

      expect(actions).toHaveAction("SHOW_PROPERTY", "JQEtq-vmq8")
    })
  })
})

describe("addSiblingValueSubject", () => {
  const store = mockStore(createState({ hasResourceWithNestedResource: true }))

  it("dispatches actions", async () => {
    await store.dispatch(addSiblingValueSubject("VDOeQCnFA8", "testerrorkey"))

    const actions = store.getActions()

    const addValueAction = actions.find((action) => action.type === "ADD_VALUE")
    expect(safeAction(addValueAction)).toEqual(expectedAddSiblingAddValueAction)
  })
})

describe("resetValueSubject", () => {
  const store = mockStore(createState({ hasResourceWithNestedResource: true }))

  it("dispatches ADD_VALUE then REMOVE_VALUE", async () => {
    await store.dispatch(resetValueSubject("VDOeQCnFA8", "testerrorkey"))

    const actions = store.getActions()

    // Should add a new blank value
    const addAction = actions.find((action) => action.type === "ADD_VALUE")
    expect(addAction).toBeTruthy()

    // The new value should use the old value's key as siblingValueKey for positioning
    expect(addAction.payload.siblingValueKey).toBe("VDOeQCnFA8")

    // The new value should have a blank valueSubject with the same template
    const newValue = addAction.payload.value
    expect(newValue.valueSubject).toBeTruthy()
    expect(newValue.valueSubject.subjectTemplate.id).toBe(
      "resourceTemplate:testing:uber2",
    )

    // Should remove the old value
    const removeAction = actions.find(
      (action) => action.type === "REMOVE_VALUE",
    )
    expect(removeAction).toBeTruthy()
    expect(removeAction.payload).toBe("VDOeQCnFA8")

    // ADD_VALUE must come before REMOVE_VALUE to preserve ordering
    const addIndex = actions.indexOf(addAction)
    const removeIndex = actions.indexOf(removeAction)
    expect(addIndex).toBeLessThan(removeIndex)
  })
})

// A child pinned to a profile version must stay on that version when the user
// adds another or resets it. Keying the rebuild on the human id would resolve
// to whatever the profile says today, silently mixing two versions of one
// template into a single parent.
describe("a version-pinned nested resource", () => {
  const pinnedVersionUri =
    "https://bluecore-dev.stanford.edu/profiles/3db30d3a-7a3e-4762-a28c-1a0efc244345/version/1"

  const newState = () =>
    createState({
      hasResourceWithNestedResource: true,
      hasVersionPinnedNestedResource: true,
    })

  it("adds a sibling against the pinned version, not the latest", async () => {
    const store = mockStore(newState())

    await store.dispatch(addSiblingValueSubject("VDOeQCnFA8", "testerrorkey"))

    const addAction = store
      .getActions()
      .find((action) => action.type === "ADD_VALUE")
    const subjectTemplate = addAction.payload.value.valueSubject.subjectTemplate
    expect(subjectTemplate.key).toBe(pinnedVersionUri)
    expect(subjectTemplate.label).toBe("Versioned Title v1")
  })

  it("resets against the pinned version, not the latest", async () => {
    const store = mockStore(newState())

    await store.dispatch(resetValueSubject("VDOeQCnFA8", "testerrorkey"))

    const addAction = store
      .getActions()
      .find((action) => action.type === "ADD_VALUE")
    const subjectTemplate = addAction.payload.value.valueSubject.subjectTemplate
    expect(subjectTemplate.key).toBe(pinnedVersionUri)
    expect(subjectTemplate.label).toBe("Versioned Title v1")
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
        keycloak,
      ),
    )

    const actions = store.getActions()

    expect(actions).toHaveAction("CLEAR_ERRORS")
    expect(actions).toHaveAction("SET_BASE_URL")
    expect(actions).toHaveAction("SAVE_RESOURCE_FINISHED")
    expect(actions).toHaveAction("ADD_RESOURCE_HISTORY", {
      resourceUri: uri,
      modified: "2020-08-20T11:34:40.887Z",
      group: "stanford",
      type: "http://id.loc.gov/ontologies/bibframe/AbbreviatedTitle",
    })
    expect(actions).toHaveAction("SET_RESOURCE_GROUP", {
      resourceKey: "t9zVwg2zO",
      group: "stanford",
      editGroups: ["cornell"],
    })

    const saveResourceFinishedAction = actions.find(
      (action) => action.type === "SAVE_RESOURCE_FINISHED",
    )
    expect(saveResourceFinishedAction.payload.resourceKey).toEqual("t9zVwg2zO")

    expect(sinopiaApi.putUserHistory).toHaveBeenCalledWith(
      "Foo McBar",
      "resource",
      "bf59d4921535b8f951f1db52584c6d6e",
      "http://localhost:3000/resource/abcdeghij23455",
      keycloak,
    )
    expect(sinopiaApi.putUserHistory).not.toHaveBeenCalledWith(
      expect.anything(),
      "template",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
  })

  it("adds a new template to the template history", async () => {
    const templateUri = "http://localhost:3000/profiles/new-template"
    sinopiaApi.putUserHistory.mockClear()
    sinopiaApi.postResource = jest.fn().mockResolvedValue(templateUri)
    sinopiaSearch.getTemplateSearchResultsByIds = jest
      .fn()
      .mockResolvedValue({ results: [] })
    const keycloak = { token: "test-token" }
    // A mock store never applies SET_BASE_URL, so give the stored resource the
    // URI the save will have assigned it.
    const state = createTemplateState()
    state.entities.subjects["8VrbxGPeF"].uri = templateUri
    const store = mockStore(state)

    await store.dispatch(
      saveNewResource(
        "8VrbxGPeF",
        "stanford",
        ["cornell"],
        "testerror",
        keycloak,
      ),
    )

    expect(sinopiaApi.putUserHistory).toHaveBeenCalledWith(
      "Foo McBar",
      "template",
      expect.any(String),
      "test:template:id",
      keycloak,
    )
    expect(sinopiaSearch.getTemplateSearchResultsByIds).toHaveBeenCalledWith([
      "test:template:id",
    ])
    expect(store.getActions()).toHaveAction("ADD_TEMPLATE_HISTORY_BY_RESULT", {
      id: "test:template:id",
      resourceLabel: "Resource Template",
      resourceURI: undefined,
      uri: templateUri,
      author: undefined,
      remark: undefined,
      date: undefined,
      group: "stanford",
      editGroups: ["cornell"],
    })
  })

  it("error when saving a new resource", async () => {
    const store = mockStore(createState({ hasResourceWithLiteral: true }))
    sinopiaApi.postResource.mockRejectedValue(new Error("Messed-up"))

    await store.dispatch(
      saveNewResource("t9zVwg2zO", "stanford", ["cornell"], "testerror"),
    )

    const actions = store.getActions()

    expect(actions).toHaveAction("ADD_ERROR", {
      errorKey: "testerror",
      error: "Error saving new resource: Messed-up",
    })
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
    state.entities.subjects.t9zVwg2zO.group = "stanford"
    const store = mockStore(state)
    const keycloak = { token: "test-token" }

    await store.dispatch(
      saveResource("t9zVwg2zO", "stanford", ["cornell"], "testerror", keycloak),
    )
    const actions = store.getActions()

    expect(actions).toHaveAction("CLEAR_ERRORS")
    expect(actions).toHaveAction("SAVE_RESOURCE_FINISHED")
    expect(actions).toHaveAction("ADD_RESOURCE_HISTORY", {
      resourceUri: "https://api.sinopia.io/resource/0894a8b3",
      type: "http://id.loc.gov/ontologies/bibframe/AbbreviatedTitle",
      group: "stanford",
      modified: "2020-08-20T11:34:40.887Z",
    })
    expect(actions).toHaveAction("SET_RESOURCE_GROUP", {
      resourceKey: "t9zVwg2zO",
      group: "stanford",
      editGroups: ["cornell"],
    })

    expect(sinopiaApi.putUserHistory).toHaveBeenCalledWith(
      "Foo McBar",
      "resource",
      "3eb9f1444e9ec984fb165fc9c4de826a",
      "https://api.sinopia.io/resource/0894a8b3",
      keycloak,
    )
  })

  it("adds an edited template to the template history", async () => {
    sinopiaApi.putUserHistory.mockClear()
    sinopiaApi.putResource = jest.fn().mockResolvedValue("8VrbxGPeF")
    sinopiaSearch.getTemplateSearchResultsByIds = jest.fn().mockResolvedValue({
      results: [{ id: "test:template:id", resourceLabel: "From search" }],
    })
    const store = mockStore(createTemplateState())
    const keycloak = { token: "test-token" }

    await store.dispatch(
      saveResource("8VrbxGPeF", "stanford", ["cornell"], "testerror", keycloak),
    )

    expect(sinopiaApi.putUserHistory).toHaveBeenCalledWith(
      "Foo McBar",
      "template",
      expect.any(String),
      "test:template:id",
      keycloak,
    )
    expect(store.getActions()).toHaveAction("ADD_TEMPLATE_HISTORY_BY_RESULT", {
      id: "test:template:id",
      resourceLabel: "From search",
    })
  })

  it("error when trying to save existing resource", async () => {
    sinopiaApi.putResource = jest.fn().mockRejectedValue(new Error("Messed-up"))
    const store = mockStore(createState({ hasResourceWithLiteral: true }))
    await store.dispatch(
      saveResource("t9zVwg2zO", "stanford", ["cornell"], "testerror"),
    )
    const actions = store.getActions()
    expect(actions).toHaveAction("ADD_ERROR", {
      errorKey: "testerror",
      error: "Error saving: Messed-up",
    })
  })
})

describe("contractProperty", () => {
  const store = mockStore(createState({ hasResourceWithLiteral: true }))

  it("removes a property values from state", async () => {
    await store.dispatch(contractProperty("JQEtq-vmq8"))
    const actions = store.getActions()
    expect(actions).toHaveAction("ADD_PROPERTY")
  })
})

describe("addMainTitle", () => {
  const store = mockStore(createState({ hasResourceWithMainTitle: true }))

  it("add title value to state", async () => {
    await store.dispatch(
      addMainTitle("cqxLskA9kjAfMFDeuvzGq", {
        literal: "Tang",
        lang: "en",
        propertyUri: "http://id.loc.gov/ontologies/bibframe/mainTitle",
      }),
    )
    const actions = store.getActions()
    expect(actions).toHaveAction("UPDATE_VALUE", {
      valueKey: "JjUhYxaBo9nuIh8GKd9k5",
      literal: "Tang",
      lang: "en",
      component: undefined,
    })
  })
})
