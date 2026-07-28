import React from "react"
import { render, act } from "@testing-library/react"
import { Provider } from "react-redux"
import configureMockStore from "redux-mock-store"
import thunk from "redux-thunk"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

// Inline jest.fn() to avoid TDZ issues with hoisted jest.mock
jest.mock("components/editor/inputs/LcshTypeahead", () => ({
  __esModule: true,
  default: jest.fn(),
}))

import InputLiteralValue from "components/editor/inputs/InputLiteralValue"
import LcshTypeahead from "components/editor/inputs/LcshTypeahead"

const mockStore = configureMockStore([thunk])

const MADS_AUTH_LABEL = "http://www.loc.gov/mads/rdf/v1#authoritativeLabel"
const VALUE_KEY = "val-key-1"
const PROPERTY_KEY = "prop-key-1"
const SUBJECT_KEY = "subj-key-1"
const SUBJECT_URI = "http://id.loc.gov/authorities/subjects/sh85002058"

const makeState = ({ subjectKey = SUBJECT_KEY } = {}) => ({
  ...createState(),
  entities: {
    ...createState().entities,
    properties: {
      [PROPERTY_KEY]: { subjectKey },
    },
    values: {},
  },
})

const value = {
  key: VALUE_KEY,
  propertyKey: PROPERTY_KEY,
  literal: "Agriculture",
  lang: "en",
  errors: [],
  propertyUri: MADS_AUTH_LABEL,
}

const propertyTemplate = {
  languageSuppressed: false,
  validationDataType: null,
  label: "Authoritative Label",
  required: false,
  ordered: false,
  uris: { [MADS_AUTH_LABEL]: "Authoritative Label" },
}

const renderComponent = (store, overrideValue = value) =>
  render(
    <Provider store={store}>
      <InputLiteralValue
        value={overrideValue}
        propertyTemplate={propertyTemplate}
        displayValidations={false}
        shouldFocus={false}
      />
    </Provider>
  )

describe("InputLiteralValue handleLcshSelect", () => {
  let capturedOnSelect

  beforeEach(() => {
    capturedOnSelect = null
    LcshTypeahead.mockImplementation(({ onSelect }) => {
      capturedOnSelect = onSelect
      return null
    })
  })

  afterEach(() => {
    LcshTypeahead.mockClear()
  })

  it("dispatches updateLiteralValue with the selected label", () => {
    const store = mockStore(makeState())
    renderComponent(store)

    act(() => {
      capturedOnSelect({ label: "Agricultural economics", uri: SUBJECT_URI })
    })

    const actions = store.getActions()
    expect(actions).toContainEqual(
      expect.objectContaining({
        type: "UPDATE_VALUE",
        payload: expect.objectContaining({
          valueKey: VALUE_KEY,
          literal: "Agricultural economics",
          lang: "en",
        }),
      })
    )
  })

  it("dispatches setSubjectComponentList when uri and subjectKey are present", () => {
    const store = mockStore(makeState())
    renderComponent(store)

    act(() => {
      capturedOnSelect({ label: "Agricultural economics", uri: SUBJECT_URI })
    })

    const actions = store.getActions()
    expect(actions).toContainEqual({
      type: "SET_SUBJECT_COMPONENT_LIST",
      payload: { subjectKey: SUBJECT_KEY, uri: SUBJECT_URI },
    })
  })

  it("does not dispatch setSubjectComponentList when uri is absent", () => {
    const store = mockStore(makeState())
    renderComponent(store)

    act(() => {
      capturedOnSelect({ label: "Agricultural economics", uri: "" })
    })

    const actions = store.getActions()
    expect(actions).not.toContainEqual(
      expect.objectContaining({ type: "SET_SUBJECT_COMPONENT_LIST" })
    )
  })

  it("does not dispatch setSubjectComponentList when subjectKey is absent", () => {
    const store = mockStore(makeState({ subjectKey: null }))
    renderComponent(store)

    act(() => {
      capturedOnSelect({ label: "Agricultural economics", uri: SUBJECT_URI })
    })

    const actions = store.getActions()
    expect(actions).not.toContainEqual(
      expect.objectContaining({ type: "SET_SUBJECT_COMPONENT_LIST" })
    )
  })

  it("renders LcshTypeahead when propertyUri is the MADS authoritative label URI", () => {
    const store = mockStore(makeState())
    renderComponent(store)

    expect(LcshTypeahead).toHaveBeenCalledWith(
      expect.objectContaining({ query: value.literal }),
      expect.anything()
    )
  })

  it("does not render LcshTypeahead when propertyUri is a different URI", () => {
    const store = mockStore(makeState())
    renderComponent(store, {
      ...value,
      propertyUri: "http://id.loc.gov/ontologies/bibframe/mainTitle",
    })

    expect(LcshTypeahead).not.toHaveBeenCalled()
  })
})
