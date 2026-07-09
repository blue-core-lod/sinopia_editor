// Copyright 2019 Stanford University see LICENSE for license

import {
  addError,
  addSuccess,
  clearErrors,
  clearSuccesses,
  hideValidationErrors,
  showValidationErrors,
} from "reducers/errors"

import { createReducer } from "reducers/index"

const handlers = {
  ADD_ERROR: addError,
  ADD_SUCCESS: addSuccess,
  CLEAR_ERRORS: clearErrors,
  CLEAR_SUCCESSES: clearSuccesses,
  HIDE_VALIDATION_ERRORS: hideValidationErrors,
  SHOW_VALIDATION_ERRORS: showValidationErrors,
}

const reducer = createReducer(handlers)

describe("addError()", () => {
  it("adds new error without existing errors", () => {
    const oldState = {
      errors: {},
    }

    const action = {
      type: "ADD_ERROR",
      payload: {
        errorKey: "rty6789",
        error: "Failed to add a resource",
      },
    }

    const newState = reducer(oldState, action)
    expect(newState.errors).toStrictEqual({
      rty6789: ["Failed to add a resource"],
    })
  })

  it("adds error to existing errors", () => {
    const oldState = {
      errors: {
        er345v2: ["Existing validation error"],
      },
    }

    const action = {
      type: "ADD_ERROR",
      payload: {
        errorKey: "er345v2",
        error: "Second validation error",
      },
    }

    const newState = reducer(oldState, action)
    expect(newState.errors.er345v2).toStrictEqual([
      "Existing validation error",
      "Second validation error",
    ])
  })
})

describe("clearErrors()", () => {
  it("sets errors to empty for a given errorKey", () => {
    const oldState = {
      errors: {
        gh345690: ["a short error", "a longer error message"],
      },
    }

    const action = {
      type: "CLEAR_ERRORS",
      payload: "gh345690",
    }

    const newState = reducer(oldState, action)

    expect(newState.errors.gh345690).toStrictEqual([])
  })
})

describe("hideValidationErrors()", () => {
  it("sets show validation error for a key to false", () => {
    const oldState = {
      resourceValidation: {
        u230f67: true,
      },
    }

    const action = {
      type: "HIDE_VALIDATION_ERRORS",
      payload: "u230f67",
    }

    const newState = reducer(oldState, action)

    expect(newState.resourceValidation.u230f67).toBeFalsy()
  })
})

describe("addSuccess()", () => {
  it("adds a message when no successes exist yet", () => {
    const oldState = { successes: {} }

    const action = {
      type: "ADD_SUCCESS",
      payload: { successKey: "abc123", message: "Resource saved" },
    }

    const newState = reducer(oldState, action)
    expect(newState.successes).toStrictEqual({
      abc123: ["Resource saved"],
    })
  })

  it("appends a message to existing successes for the same key", () => {
    const oldState = {
      successes: { abc123: ["First success"] },
    }

    const action = {
      type: "ADD_SUCCESS",
      payload: { successKey: "abc123", message: "Second success" },
    }

    const newState = reducer(oldState, action)
    expect(newState.successes.abc123).toStrictEqual([
      "First success",
      "Second success",
    ])
  })

  it("does not affect successes under other keys", () => {
    const oldState = {
      successes: { other: ["Unrelated success"] },
    }

    const action = {
      type: "ADD_SUCCESS",
      payload: { successKey: "abc123", message: "Resource saved" },
    }

    const newState = reducer(oldState, action)
    expect(newState.successes.other).toStrictEqual(["Unrelated success"])
  })
})

describe("clearSuccesses()", () => {
  it("sets successes to empty for a given successKey", () => {
    const oldState = {
      successes: {
        abc123: ["Resource saved", "Another success"],
      },
    }

    const action = {
      type: "CLEAR_SUCCESSES",
      payload: "abc123",
    }

    const newState = reducer(oldState, action)
    expect(newState.successes.abc123).toStrictEqual([])
  })
})

describe("showValidationErrors()", () => {
  it("shows validation errors for a resource", () => {
    const oldState = {
      currentModal: ["An error modal"],
      resourceValidation: {
        fgen0234: false,
      },
    }

    const action = {
      type: "SHOW_VALIDATION_ERRORS",
      payload: "fgen0234",
    }

    const newState = reducer(oldState, action)

    expect(newState.currentModal).toEqual([])
    expect(newState.resourceValidation.fgen0234).toBeTruthy()
  })
})
