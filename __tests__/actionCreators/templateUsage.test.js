import {
  loadTemplateUsage,
  checkTemplateChange,
} from "actionCreators/templateUsage"
import { dispatchResourceForEditor } from "actionCreators/resources"
import * as sinopiaApi from "sinopiaApi"
import Config from "Config"
import configureMockStore from "redux-mock-store"
import { thunk } from "redux-thunk"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

const mockStore = configureMockStore([thunk])
const keycloak = { token: "Secret" }
const profileUri = "https://api.sinopia.io/resource/0894a8b3"
const usage = { profile_uri: profileUri, instance_count: 3 }

afterEach(() => jest.restoreAllMocks())

describe("loadTemplateUsage", () => {
  it("records the usage of the profile", async () => {
    const validateSpy = jest
      .spyOn(sinopiaApi, "validateProfile")
      .mockResolvedValue(usage)
    const store = mockStore(createState())

    await store.dispatch(
      loadTemplateUsage("abc123", profileUri, { copied: true }, keycloak),
    )

    expect(validateSpy).toHaveBeenCalledWith(profileUri, keycloak)
    expect(store.getActions()).toEqual([
      {
        type: "SET_TEMPLATE_USAGE",
        payload: { resourceKey: "abc123", usage: { ...usage, copied: true } },
      },
    ])
  })

  it("records nothing when usage is unknown", async () => {
    jest.spyOn(sinopiaApi, "validateProfile").mockResolvedValue(null)
    const store = mockStore(createState())

    await store.dispatch(loadTemplateUsage("abc123", profileUri, {}, keycloak))

    expect(store.getActions()).toEqual([])
  })
})

describe("checkTemplateChange", () => {
  it("checks the resource as edited and refreshes the usage", async () => {
    const validateSpy = jest
      .spyOn(sinopiaApi, "validateProfile")
      .mockResolvedValue({ ...usage, requires_new_version: true })
    const state = createState({ hasResourceWithLiteral: true })
    const store = mockStore(state)

    const result = await store.dispatch(
      checkTemplateChange("t9zVwg2zO", keycloak),
    )

    expect(result.requires_new_version).toBe(true)
    const [uri, passedKeycloak, { resource }] = validateSpy.mock.calls[0]
    expect(uri).toEqual(state.entities.subjects.t9zVwg2zO.uri)
    expect(passedKeycloak).toBe(keycloak)
    expect(resource.key).toEqual("t9zVwg2zO")
    expect(store.getActions()).toEqual([
      {
        type: "SET_TEMPLATE_USAGE",
        payload: {
          resourceKey: "t9zVwg2zO",
          usage: { ...usage, requires_new_version: true, copied: false },
        },
      },
    ])
  })
})

describe("dispatchResourceForEditor", () => {
  const resultFor = (templateId) => [
    {},
    {
      key: "abc123",
      uri: profileUri,
      properties: [{ key: "prop1" }],
      subjectTemplate: { id: templateId, class: "http://example.com/Class" },
    },
  ]

  it("loads usage when a template is opened as a copy", async () => {
    const validateSpy = jest
      .spyOn(sinopiaApi, "validateProfile")
      .mockResolvedValue(usage)
    const store = mockStore(createState())

    store.dispatch(
      dispatchResourceForEditor(
        resultFor(Config.rootResourceTemplateId),
        profileUri,
        { asNewResource: true },
        keycloak,
      ),
    )
    await validateSpy.mock.results[0].value

    expect(validateSpy).toHaveBeenCalledWith(profileUri, keycloak)
    expect(store.getActions()).toHaveAction("SET_TEMPLATE_USAGE", {
      resourceKey: "abc123",
      usage: { ...usage, copied: true },
    })
  })

  it("does not load usage for a resource that is not a template", () => {
    const validateSpy = jest.spyOn(sinopiaApi, "validateProfile")
    const store = mockStore(createState())

    store.dispatch(
      dispatchResourceForEditor(
        resultFor("ld4p:RT:bf2:Title:AbbrTitle"),
        profileUri,
        { asNewResource: true },
        keycloak,
      ),
    )

    expect(validateSpy).not.toHaveBeenCalled()
  })
})
