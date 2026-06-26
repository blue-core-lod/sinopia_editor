import { createState } from "stateUtils"
import {
  displayResourceValidations,
  selectErrors,
  selectSuccesses,
  selectValidationErrors,
} from "selectors/errors"

describe("displayResourceValidations()", () => {
  it("defaults to false", () => {
    const state = createState()
    expect(displayResourceValidations(state, null)).toBeFalsy()
  })

  it("is false for a non-existant reource key", () => {
    const state = createState()
    expect(displayResourceValidations(state, "abc123")).toBeFalsy()
  })

  it("is true for a resource with a key set to true", () => {
    const state = createState({ hasResourceWithError: true })
    expect(displayResourceValidations(state, "3h4Fp8ANu")).toBeTruthy()
  })
})

describe("selectErrors()", () => {
  it("returns undefined if there are no editor errors", () => {
    const state = createState()
    const errors = selectErrors(state, null)
    expect(errors).toBe(undefined)
  })

  it("returns errors for a given error key", () => {
    const state = createState({ hasResourceWithError: true })
    const errors = selectErrors(state, "3h4Fp8ANu")
    expect(errors.length).toBe(2)
    expect(errors).toEqual(["error 1", "error 2"])
  })

  it("returns errors for an error key of a given resource key", () => {
    const state = createState({ hasResourceWithError: true })
    const errors = selectErrors(state, "lkqatmo20")
    expect(Object.keys(errors).length).toBe(2)
    expect(errors.dairdj42u).toEqual(["error 3"])
    expect(errors.fQMouMqB0).toEqual(["error 4"])
  })
})

describe("selectSuccesses()", () => {
  it("returns undefined when no successes exist", () => {
    const state = createState()
    expect(selectSuccesses(state, "abc123")).toBeUndefined()
  })

  it("returns messages for a given success key", () => {
    const state = createState()
    state.editor.successes = { abc123: ["Saved successfully"] }
    expect(selectSuccesses(state, "abc123")).toEqual(["Saved successfully"])
  })

  it("returns undefined for a key with no messages", () => {
    const state = createState()
    state.editor.successes = { other: ["Something else"] }
    expect(selectSuccesses(state, "abc123")).toBeUndefined()
  })
})

describe("selectValidationErrors()", () => {
  it("returns nothing if there is no subject", () => {
    const state = createState()
    const errors = selectValidationErrors(state, null)
    expect(errors.length).toBe(0)
  })

  it("returns errors for a property given a subject key", () => {
    const state = createState({ hasResourceWithLiteral: true, hasError: true })
    const errors = selectValidationErrors(state, "t9zVwg2zO")
    expect(errors.length).toBe(1)
    expect(errors[0].message).toEqual("Literal required")
    expect(errors[0].propertyKey).toEqual("JQEtq-vmq8")
    expect(errors[0].labelPath).toEqual([
      "Abbreviated Title",
      "Abbreviated Title",
    ])
  })

  it("returns errors for a property with a nested resource given a subject key", () => {
    const state = createState({
      hasResourceWithNestedResource: true,
      hasError: true,
    })
    const errors = selectValidationErrors(state, "ljAblGiBW")
    expect(errors[0].message).toEqual("Literal required")
    expect(errors[0].propertyKey).toEqual("7caLbfwwle")
    expect(errors[0].labelPath).toEqual([
      "Uber template1",
      "Uber template1, property1",
      "Uber template2",
      "Uber template2, property1",
    ])
  })
})
