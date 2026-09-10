import React from "react"
import { render, act } from "@testing-library/react"
import { Provider } from "react-redux"
import configureMockStore from "redux-mock-store"
import thunk from "redux-thunk"
import { createState } from "stateUtils"
import useEntitiesStore from "stores/entitiesStore"

import InputLiteralValue from "components/editor/inputs/InputLiteralValue"
import LcshTypeahead from "components/editor/inputs/LcshTypeahead"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

// Inline jest.fn() to avoid TDZ issues with hoisted jest.mock
jest.mock("components/editor/inputs/LcshTypeahead", () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockStore = configureMockStore([thunk])

const MADS_AUTH_LABEL = "http://www.loc.gov/mads/rdf/v1#authoritativeLabel"
const VALUE_KEY = "val-key-1"
const PROPERTY_KEY = "prop-key-1"
const SUBJECT_KEY = "subj-key-1"
const SUBJECT_URI = "http://id.loc.gov/authorities/subjects/sh85002058"

const makeState = ({ subjectKey = SUBJECT_KEY } = {}) => {
  const state = createState()
  // Seed Zustand entities store with test-specific data
  useEntitiesStore.setState({
    properties: {
      [PROPERTY_KEY]: { subjectKey },
    },
    values: {},
  })
  return state
}

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
    const spy = jest
      .spyOn(useEntitiesStore.getState(), "updateValue")
      .mockImplementation(() => {})
    const store = mockStore(makeState())
    renderComponent(store)

    act(() => {
      capturedOnSelect({ label: "Agricultural economics", uri: SUBJECT_URI })
    })

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        valueKey: VALUE_KEY,
        literal: "Agricultural economics",
        lang: "en",
      })
    )
    spy.mockRestore()
  })

  it("dispatches setSubjectComponentList when uri and subjectKey are present", () => {
    jest
      .spyOn(useEntitiesStore.getState(), "updateValue")
      .mockImplementation(() => {})
    const spy = jest
      .spyOn(useEntitiesStore.getState(), "setSubjectComponentList")
      .mockImplementation(() => {})
    const store = mockStore(makeState())
    renderComponent(store)

    act(() => {
      capturedOnSelect({ label: "Agricultural economics", uri: SUBJECT_URI })
    })

    expect(spy).toHaveBeenCalledWith(SUBJECT_KEY, SUBJECT_URI)
    spy.mockRestore()
    useEntitiesStore.getState().updateValue.mockRestore?.()
  })

  it("does not dispatch setSubjectComponentList when uri is absent", () => {
    jest
      .spyOn(useEntitiesStore.getState(), "updateValue")
      .mockImplementation(() => {})
    const spy = jest
      .spyOn(useEntitiesStore.getState(), "setSubjectComponentList")
      .mockImplementation(() => {})
    const store = mockStore(makeState())
    renderComponent(store)

    act(() => {
      capturedOnSelect({ label: "Agricultural economics", uri: "" })
    })

    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
    useEntitiesStore.getState().updateValue.mockRestore?.()
  })

  it("does not dispatch setSubjectComponentList when subjectKey is absent", () => {
    jest
      .spyOn(useEntitiesStore.getState(), "updateValue")
      .mockImplementation(() => {})
    const spy = jest
      .spyOn(useEntitiesStore.getState(), "setSubjectComponentList")
      .mockImplementation(() => {})
    const store = mockStore(makeState({ subjectKey: null }))
    renderComponent(store)

    act(() => {
      capturedOnSelect({ label: "Agricultural economics", uri: SUBJECT_URI })
    })

    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
    useEntitiesStore.getState().updateValue.mockRestore?.()
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
