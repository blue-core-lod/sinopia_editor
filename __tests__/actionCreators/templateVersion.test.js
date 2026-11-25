import { checkTemplateVersion } from "actionCreators/templateVersion"
import { dispatchResourceForEditor } from "actionCreators/resources"
import * as sinopiaApi from "sinopiaApi"
import Config from "Config"
import configureMockStore from "redux-mock-store"
import { thunk } from "redux-thunk"
import { createState } from "stateUtils"
import { selectFullSubject } from "selectors/resources"
import rdf from "rdf-ext"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

const mockStore = configureMockStore([thunk])
const keycloak = { token: "Secret" }
const profileUri =
  "https://bluecore-dev.stanford.edu/profiles/3db30d3a-7a3e-4762-a28c-1a0efc244345"
const resourceKey = "t9zVwg2zO"
const templateKey = "ld4p:RT:bf2:Title:AbbrTitle"
const workClass = "http://id.loc.gov/ontologies/bibframe/Work"
const olderCheck = {
  profile_uri: profileUri,
  is_latest: false,
  compatible: true,
  current_version_uri: `${profileUri}/version/2`,
  resource_version_uri: `${profileUri}/version/1`,
}

// A saved Work pinned to version 1 of the profile.
const versionedState = (templateAttrs = {}) => {
  const state = createState({ hasResourceWithLiteral: true })
  state.entities.subjectTemplates[templateKey] = {
    ...state.entities.subjectTemplates[templateKey],
    class: workClass,
    profileUri,
    versionUri: `${profileUri}/version/1`,
    ...templateAttrs,
  }
  return state
}

afterEach(() => jest.restoreAllMocks())

describe("checkTemplateVersion", () => {
  it("records the check when the resource is on an older version", async () => {
    const validateSpy = jest
      .spyOn(sinopiaApi, "validateProfile")
      .mockResolvedValue(olderCheck)
    const state = versionedState()
    const store = mockStore(state)

    await store.dispatch(checkTemplateVersion(resourceKey, keycloak))

    expect(validateSpy).toHaveBeenCalledWith(profileUri, keycloak, {
      resourceUri: selectFullSubject(state, resourceKey).uri,
    })
    expect(store.getActions()).toEqual([
      {
        type: "SET_TEMPLATE_VERSION_CHECK",
        payload: { resourceKey, check: olderCheck },
      },
    ])
  })

  it("records nothing when the resource was closed before the check came back", async () => {
    let resolveValidate
    jest.spyOn(sinopiaApi, "validateProfile").mockReturnValue(
      new Promise((resolve) => {
        resolveValidate = resolve
      }),
    )
    const state = versionedState()
    const store = mockStore(state)

    const pending = store.dispatch(checkTemplateVersion(resourceKey, keycloak))
    // The cataloger closes the resource while the check is in flight.
    delete state.entities.subjects[resourceKey]
    resolveValidate(olderCheck)
    await pending

    expect(store.getActions()).toEqual([])
  })

  it("records nothing when the resource is on the latest version", async () => {
    jest
      .spyOn(sinopiaApi, "validateProfile")
      .mockResolvedValue({ ...olderCheck, is_latest: true })
    const store = mockStore(versionedState())

    await store.dispatch(checkTemplateVersion(resourceKey, keycloak))

    expect(store.getActions()).toEqual([])
  })

  it("records nothing when the response has no is_latest", async () => {
    jest
      .spyOn(sinopiaApi, "validateProfile")
      .mockResolvedValue({ profile_uri: profileUri, instance_count: 3 })
    const store = mockStore(versionedState())

    await store.dispatch(checkTemplateVersion(resourceKey, keycloak))

    expect(store.getActions()).toEqual([])
  })

  it("records nothing when validation fails", async () => {
    jest.spyOn(sinopiaApi, "validateProfile").mockResolvedValue(null)
    const store = mockStore(versionedState())

    await store.dispatch(checkTemplateVersion(resourceKey, keycloak))

    expect(store.getActions()).toEqual([])
  })

  it("skips templates, unsaved copies, and unversioned templates", async () => {
    const validateSpy = jest.spyOn(sinopiaApi, "validateProfile")
    const unsaved = versionedState()
    unsaved.entities.subjects[resourceKey].uri = null
    const states = [
      versionedState({ id: Config.rootResourceTemplateId }),
      unsaved,
      versionedState({ versionUri: null }),
    ]

    for (const state of states) {
      const store = mockStore(state)
      expect(
        await store.dispatch(checkTemplateVersion(resourceKey, keycloak)),
      ).toBeNull()
      expect(store.getActions()).toEqual([])
    }
    expect(validateSpy).not.toHaveBeenCalled()
  })

  it("skips Hubs", async () => {
    const validateSpy = jest.spyOn(sinopiaApi, "validateProfile")
    const store = mockStore(
      versionedState({ class: "http://id.loc.gov/ontologies/bibframe/Hub" }),
    )

    expect(
      await store.dispatch(checkTemplateVersion(resourceKey, keycloak)),
    ).toBeNull()
    expect(validateSpy).not.toHaveBeenCalled()
    expect(store.getActions()).toEqual([])
  })
})

describe("dispatchResourceForEditor", () => {
  beforeEach(() => {
    jest.spyOn(sinopiaApi, "putUserHistory").mockResolvedValue()
  })

  const open = (state, options) => {
    const resource = selectFullSubject(state, resourceKey)
    const store = mockStore(state)
    store.dispatch(
      dispatchResourceForEditor(
        // [response, resource, unusedDataset, dataset]
        [{ group: "stanford" }, resource, null, rdf.dataset()],
        resource.uri,
        options,
        keycloak,
      ),
    )
    return resource
  }

  it("checks the template version of an opened resource", async () => {
    const validateSpy = jest
      .spyOn(sinopiaApi, "validateProfile")
      .mockResolvedValue(olderCheck)

    const resource = open(versionedState(), {})
    await validateSpy.mock.results[0].value

    expect(validateSpy).toHaveBeenCalledWith(profileUri, keycloak, {
      resourceUri: resource.uri,
    })
  })

  it("does not check a copy", () => {
    const validateSpy = jest.spyOn(sinopiaApi, "validateProfile")

    open(versionedState(), { asNewResource: true })

    expect(validateSpy).not.toHaveBeenCalled()
  })

  it("does not check when told not to", () => {
    const validateSpy = jest.spyOn(sinopiaApi, "validateProfile")

    open(versionedState(), { checkTemplateVersion: false })

    expect(validateSpy).not.toHaveBeenCalled()
  })
})
