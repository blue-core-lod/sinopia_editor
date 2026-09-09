import { addError } from "actions/errors"
import _ from "lodash"
import { loadResourceTemplateWithoutValidation } from "./templates"

/**
 * Helper methods that should only be used in 'actionCreators/templates'
 */

/**
 * A thunk that validates a subject template model.
 * Note that this may involve loading additional subject templates.
 * @return [Array<String>] errors
 */
export const validateTemplates =
  (subjectTemplate, resourceTemplatePromises, errorKey) => (dispatch) =>
    Promise.all([
      Promise.resolve(validateSubjectTemplate(subjectTemplate)),
      Promise.resolve(validateSuppressible(subjectTemplate)),
      Promise.resolve(
        validatePropertyTemplates(subjectTemplate.propertyTemplates)
      ),
      dispatch(
        validateAllRefResourceTemplatesExist(
          subjectTemplate.propertyTemplates,
          resourceTemplatePromises
        )
      ),
      dispatch(
        validateRepeatedPropertyTemplates(
          subjectTemplate.propertyTemplates,
          resourceTemplatePromises
        )
      ),
      dispatch(
        validateAllUniqueResourceURIs(
          subjectTemplate.propertyTemplates,
          resourceTemplatePromises
        )
      ),
    ]).then((errors) => {
      const flatErrors = errors.flat()
      flatErrors.forEach((error) => dispatch(addError(errorKey, error)))
      return _.isEmpty(flatErrors)
    })

const validateSubjectTemplate = (template) => {
  const errors = []
  if (!template.id)
    errors.push("Resource template id is missing from resource template.")
  if (!template.class)
    errors.push("Resource template class is missing from resource template.")
  if (!template.label)
    errors.push("Resource template label is missing from resource template.")
  return errors
}

const validateSuppressible = (template) => {
  if (!template.suppressible) return []

  if (template.propertyTemplates.length !== 1)
    return [
      "A suppressible template cannot contain more than one property template.",
    ]
  if (template.propertyTemplates[0].type !== "uri")
    return ["The property for a suppressible template must be a URI or lookup."]
  return []
}

const validatePropertyTemplates = (propertyTemplates) => {
  const errors = []
  propertyTemplates.forEach((template) =>
    errors.push(validatePropertyTemplate(template))
  )
  return errors.flat()
}

const validatePropertyTemplate = (template) => {
  const errors = []
  const firstUri = _.first(Object.keys(template.uris || {}))
  if (_.isEmpty(template.uris)) {
    errors.push("Property template URI is required.")
    return errors
  }
  if (!template.label)
    errors.push(`Property template label is required for ${firstUri}.`)
  if (!template.type)
    errors.push(
      `Cannot determine type for ${firstUri}. Must be resource, lookup, or literal.`
    )
  if (!template.component)
    errors.push(`Cannot determine component for ${firstUri}.`)
  template.authorities.forEach((authority) => {
    if (!authority.label)
      errors.push(`Misconfigured authority ${authority.uri} for ${firstUri}.`)
  })
  if (
    template.type === "resource" &&
    _.isEmpty(template.valueSubjectTemplateKeys)
  ) {
    errors.push(
      `The field "${template.label}" with property "${_.first(
        Object.keys(template.uris)
      )}" has type nested resource, but does not specify a template in Nested resource attributes.`
    )
  }

  return errors
}

const validateRepeatedPropertyTemplates =
  (propertyTemplates, resourceTemplatePromises) => (dispatch) => {
    // Collected first and classified once everything has resolved, rather
    // than flagged as each promise resolves -- the same (uri, class) pair
    // can legitimately appear twice (see below), and Promise resolution
    // order is not guaranteed, so the exactly-one-non-suppressible check
    // needs every occurrence in hand before deciding.
    const plainUris = []
    const nestedEntries = []

    return Promise.all(
      propertyTemplates.map((propertyTemplate) => {
        if (_.isEmpty(propertyTemplate.uris)) return Promise.resolve()

        return Promise.all(
          Object.keys(propertyTemplate.uris).map((uri) => {
            if (_.isEmpty(propertyTemplate.valueSubjectTemplateKeys)) {
              plainUris.push(uri)
              return Promise.resolve()
            }
            return Promise.all(
              propertyTemplate.valueSubjectTemplateKeys.map(
                (subjectTemplateKey) =>
                  dispatch(
                    loadResourceTemplateWithoutValidation(
                      subjectTemplateKey,
                      resourceTemplatePromises
                    )
                  )
                    .then((resourceTemplate) => {
                      Object.keys(resourceTemplate.classes).forEach(
                        (clazz) => {
                          nestedEntries.push({
                            uri,
                            clazz,
                            suppressible: resourceTemplate.suppressible,
                          })
                        }
                      )
                    })
                    // Some templates may not exist. This is not validated here.
                    .catch(() => {})
              )
            )
          })
        )
      })
    ).then(() => {
      const dupes = new Set()

      // A plain (non-nested) property URI should never repeat.
      const plainUriCounts = {}
      plainUris.forEach((uri) => {
        plainUriCounts[uri] = (plainUriCounts[uri] || 0) + 1
      })
      Object.keys(plainUriCounts).forEach((uri) => {
        if (plainUriCounts[uri] > 1) dupes.add(uri)
      })

      // A nested resource property URI may repeat across different classes,
      // and may repeat for the SAME class only when exactly one of the
      // sharing candidates is non-suppressible -- a suppressible template
      // exists only to catch values with no local type at all, so pairing
      // it with one non-suppressible candidate for the same class is
      // resolved unambiguously at load time, not a real conflict.
      const byUriAndClass = {}
      nestedEntries.forEach(({ uri, clazz, suppressible }) => {
        const key = `${uri} ${clazz}`
        if (!byUriAndClass[key]) byUriAndClass[key] = { uri, suppressible: [] }
        byUriAndClass[key].suppressible.push(suppressible)
      })
      Object.values(byUriAndClass).forEach(({ uri, suppressible }) => {
        const nonSuppressibleCount = suppressible.filter(
          (isSuppressible) => !isSuppressible
        ).length
        if (suppressible.length > 1 && nonSuppressibleCount !== 1)
          dupes.add(uri)
      })

      // A plain property URI must never coincide with a nested resource
      // property URI, regardless of class.
      const nestedUris = new Set(nestedEntries.map((entry) => entry.uri))
      plainUris.forEach((uri) => {
        if (nestedUris.has(uri)) dupes.add(uri)
      })

      if (_.isEmpty(dupes)) return []

      return [
        `A property template may not use the same property URI as another property template (${Array.from(
          dupes
        ).join(
          ", "
        )}) unless both propery templates are of type nested resource and the nested resources are of different classes.`,
      ]
    })
  }

const validateAllRefResourceTemplatesExist =
  (propertyTemplates, resourceTemplatePromises) => (dispatch) =>
    Promise.all(
      propertyTemplates.map((template) =>
        dispatch(
          validateRefResourceTemplatesExist(template, resourceTemplatePromises)
        )
      )
    ).then((missingResourceTemplateIds) => {
      // If misssing, then write errors for uniq
      const uniqMissingResourceTemplateIds = _.uniq(
        missingResourceTemplateIds.flat()
      )
      if (_.isEmpty(uniqMissingResourceTemplateIds)) return []
      return [
        `The following referenced resource templates are not available in Sinopia: ${uniqMissingResourceTemplateIds.join(
          ", "
        )}`,
      ]
    })

/**
 * Validates that all value template refs exist.
 */
const validateRefResourceTemplatesExist =
  (propertyTemplate, resourceTemplatePromises) => (dispatch) => {
    if (_.isEmpty(propertyTemplate.valueSubjectTemplateKeys))
      return Promise.resolve([])

    return Promise.all(
      propertyTemplate.valueSubjectTemplateKeys.map((resourceTemplateId) =>
        dispatch(
          loadResourceTemplateWithoutValidation(
            resourceTemplateId,
            resourceTemplatePromises
          )
        )
          .then(() => null)
          .catch(() => resourceTemplateId)
      )
    ).then((missingResourceTemplateIds) =>
      _.compact(missingResourceTemplateIds)
    )
  }

const validateAllUniqueResourceURIs =
  (propertyTemplates, resourceTemplatePromises) => (dispatch) =>
    Promise.all(
      propertyTemplates.map((propertyTemplate) =>
        dispatch(
          validateUniqueResourceURIs(propertyTemplate, resourceTemplatePromises)
        )
      )
    ).then((errors) => errors.flat())

/**
 * Validates that all value template refs have unique resource URIs.
 */
const validateUniqueResourceURIs =
  (propertyTemplate, resourceTemplatePromises) => (dispatch) => {
    if (_.isEmpty(propertyTemplate.valueSubjectTemplateKeys))
      return Promise.resolve([])

    return Promise.all(
      propertyTemplate.valueSubjectTemplateKeys.map((resourceTemplateId) =>
        dispatch(
          loadResourceTemplateWithoutValidation(
            resourceTemplateId,
            resourceTemplatePromises
          )
        )
          .then((subjectTemplate) => [
            subjectTemplate.class,
            Object.keys(subjectTemplate.classes),
            subjectTemplate.id,
            subjectTemplate.suppressible,
          ])
          .catch(() => {
            /* nothing */
          })
      )
    ).then((results) => {
      // No other nested template can have (required) class or optional class that is the same as this (required) class.
      // Nested templates can have same optional classes. The one exception:
      // a suppressible template exists only to catch values with no local
      // type at all, so if exactly one non-suppressible candidate shares a
      // class with one or more suppressible candidates, loading resolves
      // that unambiguously to the non-suppressible one -- not an error.
      const classToCandidates = {}
      const classes = []
      _.compact(results).forEach((result) => {
        const [clazz, allClasses, resourceTemplateId, suppressible] = result
        classes.push(clazz)
        allClasses.forEach((allClazz) => {
          if (!classToCandidates[allClazz]) classToCandidates[allClazz] = []
          classToCandidates[allClazz].push({ resourceTemplateId, suppressible })
        })
      })

      const multipleClasses = new Set()
      classes.forEach((clazz) => {
        const candidates = classToCandidates[clazz]
        const nonSuppressibleCount = candidates.filter(
          (candidate) => !candidate.suppressible
        ).length
        if (candidates.length > 1 && nonSuppressibleCount !== 1)
          multipleClasses.add(clazz)
      })
      return Array.from(multipleClasses).map((clazz) => {
        const classIdsStr = classToCandidates[clazz]
          .map((candidate) => candidate.resourceTemplateId)
          .join(", ")
        return `The following resource templates references for ${_.first(
          Object.keys(propertyTemplate.uris)
        )} have the same class (${clazz}), but must be unique: ${classIdsStr}`
      })
    })
  }

export const noop = () => {}
