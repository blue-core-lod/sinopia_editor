export const addError = (errorKey, error) => ({
  type: "ADD_ERROR",
  payload: { errorKey, error },
})

export const clearErrors = (errorKey) => ({
  type: "CLEAR_ERRORS",
  payload: errorKey,
})

export const addSuccess = (successKey, message) => ({
  type: "ADD_SUCCESS",
  payload: { successKey, message },
})

export const clearSuccesses = (successKey) => ({
  type: "CLEAR_SUCCESSES",
  payload: successKey,
})

export const hideValidationErrors = (resourceKey) => ({
  type: "HIDE_VALIDATION_ERRORS",
  payload: resourceKey,
})

export const showValidationErrors = (resourceKey) => ({
  type: "SHOW_VALIDATION_ERRORS",
  payload: resourceKey,
})
