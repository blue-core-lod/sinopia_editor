// Copyright 2020 Stanford University see LICENSE for license

import { hideModal } from "./modals"

/**
 * Hide validation errors
 * @param {Object} state the previous redux state
 * @return {Object} the next redux state
 */
export const hideValidationErrors = (state, action) =>
  setValidationError(state, action.payload, false)

export const addError = (state, action) => ({
  ...state,
  errors: {
    ...state.errors,
    [action.payload.errorKey]: [
      ...(state.errors[action.payload.errorKey] || []),
      action.payload.error,
    ],
  },
})

export const clearErrors = (state, action) => ({
  ...state,
  errors: {
    ...state.errors,
    [action.payload]: [],
  },
})

export const addSuccess = (state, action) => ({
  ...state,
  successes: {
    ...state.successes,
    [action.payload.successKey]: [
      ...(state.successes?.[action.payload.successKey] || []),
      action.payload.message,
    ],
  },
})

export const clearSuccesses = (state, action) => ({
  ...state,
  successes: {
    ...state.successes,
    [action.payload]: [],
  },
})

/**
 * Close modals and show validation errors
 * @param {Object} state the previous redux state
 * @return {Object} the next redux state
 */
export const showValidationErrors = (state, action) => {
  const newState = hideModal(state)
  return setValidationError(newState, action.payload, true)
}

const setValidationError = (state, resourceKey, value) => ({
  ...state,
  resourceValidation: {
    ...state.resourceValidation,
    [resourceKey]: value,
  },
})
