// Copyright 2019 Stanford University see LICENSE for license
import { addError } from "actions/errors"
import { validateTemplates } from "./templateValidationHelpers"
import Config from "Config"
import { addTemplates } from "actions/templates"
import { selectSubjectAndPropertyTemplates } from "selectors/templates"
import TemplatesBuilder from "TemplatesBuilder"
import { fetchResource } from "sinopiaApi"
import { resourceToName } from "../utilities/Utilities"
import { selectUser } from "selectors/authenticate"
import { getTemplateSearchResultsByIds } from "sinopiaSearch"

/**
 * A thunk that gets a resource template from state or the server.
 * @return [Object] subject template
 */
export const loadResourceTemplate =
  (resourceTemplateId, resourceTemplatePromises, errorKey) => (dispatch) =>
    dispatch(
      loadResourceTemplateWithoutValidation(
        resourceTemplateId,
        resourceTemplatePromises
      )
    )
      .then((subjectTemplate) =>
        dispatch(
          validateTemplates(subjectTemplate, resourceTemplatePromises, errorKey)
        ).then((isValid) => (isValid ? subjectTemplate : null))
      )
      .catch((err) => {
        dispatch(
          addError(
            errorKey,
            `Error retrieving ${resourceTemplateId}: ${err.message || err}`
          )
        )
        return null
      })

/**
 * A thunk that gets a resource template from state or the server and transforms to
 * subject template and property template models and adds to state.
 * Validation is not performed. This means that invalid templates can be stored in state.
 * @return [Object] subject template
 * @throws when error occurs retrieving the resource template.
 */
export const loadResourceTemplateWithoutValidation =
  (resourceTemplateId, resourceTemplatePromises) => (dispatch, getState) => {
    // Try to get it from resourceTemplatePromises.
    // Using this cache since in some cases, adding to state to too slow.
    const resourceTemplatePromise =
      resourceTemplatePromises?.[resourceTemplateId]
    if (resourceTemplatePromise) {
      return resourceTemplatePromise
    }
    // Try to get it from state.
    const subjectTemplate = selectSubjectAndPropertyTemplates(
      getState(),
      resourceTemplateId
    )
    if (subjectTemplate) {
      return Promise.resolve(subjectTemplate)
    }

    // If resourceTemplateId is not a full URI, search for it to get the URI
    const isFullUri =
      resourceTemplateId.startsWith("http://") ||
      resourceTemplateId.startsWith("https://")

    const templateUriPromise = isFullUri
      ? Promise.resolve(resourceTemplateId)
      : getTemplateSearchResultsByIds([resourceTemplateId]).then(
          (searchResults) => {
            if (searchResults.results && searchResults.results.length > 0) {

              // Filter results to find the one matching the requested template ID
              // This is necessary because Blue Core search returns multiple results
              // Try multiple possible field names for the template ID
              const matchingResult = searchResults.results.find(
                result => result.resourceId === resourceTemplateId ||
                         result.id === resourceTemplateId ||
                         result.templateId === resourceTemplateId
              )

              if (matchingResult && matchingResult.uri) {
                const uri = matchingResult.uri
                return uri
              }

              // If no exact match found, log the issue and fall back
              console.warn(`Template search for ${resourceTemplateId} returned ${searchResults.results.length} results but none matched`, searchResults.results)
            }

            // Fallback to legacy URI construction if search fails
            const fallbackUri = `${Config.sinopiaApiBase}/resource/${resourceToName(
              resourceTemplateId
            )}`
            console.warn(`Template search failed for ${resourceTemplateId}, using fallback:`, fallbackUri)
            return fallbackUri
          }
        )

    const newResourceTemplatePromise = templateUriPromise.then((templateUri) => {
      return fetchResource(templateUri, {
        isTemplate: true,
      }).then(([dataset, response]) => {
        const user = selectUser(getState())
        const subjectTemplate = new TemplatesBuilder(
          dataset,
          templateUri,
          user.username,
          response.group,
          response.editGroups
        ).build()
        // Validate that the loaded template matches the requested ID
        // Only check when we used search (not a full URI), to work around Blue Core search
        if (!isFullUri && subjectTemplate.id !== resourceTemplateId) {
          const error = new Error(
            `Search returned wrong template: requested ${resourceTemplateId} but got ${subjectTemplate.id} from ${templateUri}. This indicates the Blue Core API search index is misconfigured.`
          )
          console.error(error.message)
          throw error
        }

        dispatch(addTemplates(subjectTemplate))
        return subjectTemplate
      })
    })

    if (resourceTemplatePromises)
      resourceTemplatePromises[resourceTemplateId] = newResourceTemplatePromise
    return newResourceTemplatePromise
  }
