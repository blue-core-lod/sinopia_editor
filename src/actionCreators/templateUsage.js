// Copyright 2026 Stanford University see LICENSE for license
import { setTemplateUsage } from "actions/resources"
import { selectFullSubject } from "selectors/resources"
import { selectUnusedRDF } from "selectors/modals"
import { validateProfile } from "sinopiaApi"

/**
 * A thunk that records what uses the profile a template resource was loaded
 * from, for the template usage warnings (#209).
 * @param {string} resourceKey the template resource in the editor
 * @param {string} profileUri the profile it was loaded from
 * @param {boolean} copied true when the resource is a new copy of the profile
 *   rather than the profile itself
 * @return {Promise<Object|null>} the validation response, or null if unknown
 */
export const loadTemplateUsage =
  (resourceKey, profileUri, { copied = false } = {}, keycloak) =>
  (dispatch) =>
    validateProfile(profileUri, keycloak).then((usage) => {
      if (usage) dispatch(setTemplateUsage(resourceKey, { ...usage, copied }))
      return usage
    })

/**
 * A thunk that asks the API whether saving a template resource as edited would
 * leave the resources made with it unable to move to the new version
 * (requires_new_version). The response also refreshes the recorded usage.
 * @param {string} resourceKey the saved template resource in the editor
 * @return {Promise<Object|null>} the validation response, or null if unknown
 */
export const checkTemplateChange =
  (resourceKey, keycloak) => (dispatch, getState) => {
    const state = getState()
    const resource = selectFullSubject(state, resourceKey)
    return validateProfile(resource.uri, keycloak, {
      resource,
      unusedRDF: selectUnusedRDF(state, resourceKey),
    }).then((usage) => {
      if (usage)
        dispatch(setTemplateUsage(resourceKey, { ...usage, copied: false }))
      return usage
    })
  }
