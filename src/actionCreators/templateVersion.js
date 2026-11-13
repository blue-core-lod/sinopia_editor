// Copyright 2026 Stanford University see LICENSE for license
import _ from "lodash"
import { clearResource, setTemplateVersionCheck } from "actions/resources"
import { showValidationErrors } from "actions/errors"
import {
  selectFullSubject,
  selectPickSubject,
  selectTemplateVersionCheck,
} from "selectors/resources"
import {
  hasValidationErrors,
  selectErrors,
  selectValidationErrors,
} from "selectors/errors"
import { validateProfile } from "sinopiaApi"
import { isTemplate } from "utilities/SinopiaApiHelper"
import { isBfWork, isBfInstance } from "utilities/Bibframe"
import { resourceEditErrorKey } from "utilities/errorKeyFactory"
import {
  dispatchResourceForEditor,
  loadResource,
  saveResource,
} from "./resources"

/**
 * A thunk that asks the API whether a saved resource is pinned to the latest
 * version of its profile, for the older template version warning (#210). The
 * check is recorded only when the resource is on an older version.
 *
 * Only Works and Instances are checked, since those are the only records the
 * API looks up by resource_uri (blue-core-lod/bluecore_api#395). Hubs are
 * skipped until the API supports them (see the bluecore_api follow-up ticket),
 * at which point this check should include them.
 * @param {string} resourceKey the resource in the editor
 * @return {Promise<Object|null>} the validation response, or null if unchecked
 */
export const checkTemplateVersion =
  (resourceKey, keycloak) => (dispatch, getState) => {
    const resource = selectFullSubject(getState(), resourceKey)
    if (!resource || isTemplate(resource) || !resource.uri)
      return Promise.resolve(null)
    const { versionUri, profileUri } = resource.subjectTemplate
    const classes = [resource.subjectTemplate.class]
    if (!versionUri || !(isBfWork(classes) || isBfInstance(classes)))
      return Promise.resolve(null)
    return validateProfile(profileUri, keycloak, {
      resourceUri: resource.uri,
    }).then((check) => {
      if (check?.is_latest === false)
        dispatch(setTemplateVersionCheck(resourceKey, check))
      return check
    })
  }

/**
 * A thunk that re-publishes a resource with the latest version of its template
 * (#210): it refetches the stored resource, rebuilds it against
 * check.current_version_uri, swaps it in for the open one, and saves it, so the
 * save writes the new version pin.
 *
 * If the rebuilt resource would not pass validation, nothing is swapped or
 * saved: the original stays open and its check records the fields that need
 * filling in (needsFields), so the cataloger can choose what to do. With
 * skipValidation (the cataloger chose to go ahead), the rebuilt resource is
 * swapped in with its validation errors showing, and not saved.
 * @param {string} resourceKey the open resource, on an older version
 * @param {string} errorKey where load errors go
 * @return {Promise<boolean>} true if re-published
 */
export const republishWithLatestTemplate =
  (resourceKey, errorKey, keycloak, { skipValidation = false } = {}) =>
  (dispatch, getState) => {
    const check = selectTemplateVersionCheck(getState(), resourceKey)
    const { uri, group, editGroups } = selectPickSubject(
      getState(),
      resourceKey,
      ["uri", "group", "editGroups"],
    )
    return dispatch(
      loadResource(uri, errorKey, {
        keycloak,
        resourceTemplateId: check.current_version_uri,
      }),
    ).then((result) => {
      // The original stays open.
      if (!result) return false
      const newKey = result[1].key

      // Before the swap, so a resource Save would refuse is never saved.
      // compatible from the API misses a property that was already required
      // but is empty in the stored data.
      if (!skipValidation && hasValidationErrors(getState(), newKey)) {
        // Snapshot first, since the property keys go away with newKey.
        const needsFields = selectValidationErrors(getState(), newKey).map(
          (error) => ({
            label: error.labelPath.join(" > "),
            message: error.message,
          }),
        )
        dispatch(clearResource(newKey))
        dispatch(
          setTemplateVersionCheck(resourceKey, { ...check, needsFields }),
        )
        return false
      }

      dispatch(clearResource(resourceKey))
      // No version check on this reload: it would hit the API before the save
      // below, come back is_latest: false, and could replace the success
      // message with the warning again.
      dispatch(
        dispatchResourceForEditor(
          result,
          uri,
          { checkTemplateVersion: false },
          keycloak,
        ),
      )

      if (skipValidation) {
        dispatch(showValidationErrors(newKey))
        return false
      }

      const saveErrorKey = resourceEditErrorKey(newKey)
      // saveResource never rejects; its errors land under saveErrorKey.
      return dispatch(
        saveResource(newKey, group, editGroups, saveErrorKey, keycloak),
      ).then(() => {
        if (!_.isEmpty(selectErrors(getState(), saveErrorKey))) return false
        dispatch(
          setTemplateVersionCheck(newKey, { ...check, republished: true }),
        )
        return true
      })
    })
  }
