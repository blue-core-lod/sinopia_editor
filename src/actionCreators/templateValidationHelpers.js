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
    // than flagged as each promise resolves -- deciding whether a (uri,
    // class) pair is a conflict depends on how many *other* property
    // templates contribute to it, and Promise resolution order is not
    // guaranteed, so every occurrence has to be in hand before deciding.
    const plainUris = []
    const nestedEntries = []

    return Promise.all(
      propertyTemplates.map((propertyTemplate, propertyTemplateIndex) => {
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
                      nestedEntries.push({
                        propertyTemplateIndex,
                        uri,
                        requiredClass: resourceTemplate.class,
                        allClasses: Object.keys(resourceTemplate.classes),
                      })
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

      // This check is only about collisions BETWEEN property templates.
      // Several nested templates offered by a SINGLE property template are
      // validated by validateUniqueResourceURIs, which knows the suppressible
      // exemption (one suppressible plus one non-suppressible sharing a class
      // resolves unambiguously at load time). That exemption must not be
      // applied here: two property templates sharing a property URI each
      // match the same triples independently at load time and would duplicate
      // the value into both fields, whether or not either is suppressible.
      //
      // Two property templates may share a property URI only when their
      // nested resources are of different classes -- a required class must
      // not appear among any other nested template's classes, required or
      // optional. Sharing only an optional class is allowed.
      const propertyTemplatesByUriAndClass = {}
      nestedEntries.forEach(({ propertyTemplateIndex, uri, allClasses }) => {
        allClasses.forEach((clazz) => {
          const key = `${uri} ${clazz}`
          if (!propertyTemplatesByUriAndClass[key])
            propertyTemplatesByUriAndClass[key] = new Set()
          propertyTemplatesByUriAndClass[key].add(propertyTemplateIndex)
        })
      })
      nestedEntries.forEach(({ uri, requiredClass }) => {
        if (propertyTemplatesByUriAndClass[`${uri} ${requiredClass}`].size > 1)
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
