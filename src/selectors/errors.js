import { selectProperty, selectSubject, selectNormSubject } from "./resources"
import _ from "lodash"

export const hasValidationErrors = (state, resourceKey) => {
  const subject = selectNormSubject(state, resourceKey)
  return !_.isEmpty(subject?.descWithErrorPropertyKeys)
}

export const selectValidationErrors = (state, resourceKey) => {
  const subject = selectSubject(state, resourceKey)
  if (subject == null || !subject.descWithErrorPropertyKeys) return []

  const errors = []

  subject.descWithErrorPropertyKeys.forEach((propertyKey) => {
    const property = selectProperty(state, propertyKey)
    if (!property || !property.descWithErrorPropertyKeys) return

    if (
      property.descWithErrorPropertyKeys.length === 1 &&
      property.values !== null
    ) {
      property.values.forEach((value) => {
        if (!value || !value.errors) return
        value.errors.forEach((error) => {
          const newError = {
            message: error,
            propertyKey: property.key,
            labelPath: property.labels,
          }
          errors.push(newError)
        })
      })
    }
  })
  return errors
}
