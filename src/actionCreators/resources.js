import useHistoryStore from "stores/historyStore"
import useEditorStore from "stores/editorStore"
import useEntitiesStore from "stores/entitiesStore"
import {
  addResourceFromDataset,
  addEmptyResource,
  newSubject,
  newSubjectCopy,
  newPropertiesFromTemplates,
  chooseURI,
  defaultValuesFor,
  resourceTemplateIdFromDataset,
} from "./resourceHelpers"
import { putResource, postResource, fetchResource } from "sinopiaApi"
import {
  selectProperty,
  selectNormProperty,
  selectValue,
  selectFullSubject,
  selectMainTitleProperty,
} from "selectors/resources"
import { newLiteralValue, newValueSubject } from "utilities/valueFactory"
import useAuthenticateStore from "stores/authenticateStore"
import {
  addTemplateHistory as addUserTemplateHistory,
  addResourceHistory as addUserResourceHistory,
} from "actionCreators/user"
import { addResourceHistory } from "actionCreators/history"
import _ from "lodash"
import { loadRelationships } from "./relationships"

/**
 * A thunk that loads an existing resource from Sinopia API and adds to state.
 * @return {[resource, unusedDataset]} if successful
 */
export const loadResource =
  (
    uri,
    errorKey,
    { asNewResource = false, version = null, keycloak = null } = {}
  ) =>
  (dispatch) => {
    useEditorStore.getState().clearErrors(errorKey)
    return fetchResource(uri, { version })
      .then(([dataset, response]) => {
        if (!dataset) return false
        const resourceTemplateId = resourceTemplateIdFromDataset(uri, dataset)

        // If no resource template ID, store pending data and show modal
        if (!resourceTemplateId) {
          useEditorStore.getState().setPendingResourceTemplateSelection({
            uri,
            dataset,
            response,
            asNewResource,
            errorKey,
            keycloak,
          })
          useEditorStore.getState().showModal("ResourceTemplateChoiceModal")
          return false
        }

        return dispatch(
          addResourceFromDataset(
            dataset,
            uri,
            resourceTemplateId,
            errorKey,
            asNewResource,
            _.pick(response, ["group", "editGroups"])
          )
        )
          .then(([resource, usedDataset]) => {
            const unusedDataset = dataset.difference(usedDataset)
            useEditorStore
              .getState()
              .setUnusedRDF(
                resource.key,
                unusedDataset.size > 0 ? unusedDataset.toCanonical() : null
              )
            dispatch(loadRelationships(resource.key, uri, errorKey))
            return [response, resource, unusedDataset]
          })
          .catch((err) => {
            // ResourceTemplateErrors have already been dispatched.
            if (err.name !== "ResourceTemplateError") {
              console.error(err)
              useEditorStore
                .getState()
                .addError(
                  errorKey,
                  `Error retrieving ${uri}: ${err.message || err}`
                )
            }
            return false
          })
      })
      .catch((err) => {
        // console.error(err)
        useEditorStore
          .getState()
          .addError(errorKey, `Error retrieving ${uri}: ${err.message || err}`)
        return false
      })
  }

export const loadResourceForEditor =
  (uri, errorKey, { asNewResource = false } = {}, keycloak) =>
  (dispatch) =>
    dispatch(loadResource(uri, errorKey, { asNewResource, keycloak })).then(
      (result) =>
        dispatch(
          dispatchResourceForEditor(result, uri, { asNewResource }, keycloak)
        )
    )

export const dispatchResourceForEditor =
  (result, uri, { asNewResource = false } = {}, keycloak) =>
  (dispatch) => {
    if (!result) return false
    const [response, resource] = result
    useEditorStore
      .getState()
      .setCurrentComponent(
        resource.key,
        resource.properties[0].key,
        resource.properties[0].key
      )
    useEditorStore.getState().setCurrentEditResource(resource.key)
    if (!asNewResource) {
      dispatch(addUserResourceHistory(uri, keycloak))
      dispatch(
        addResourceHistory(
          resource.uri,
          resource.subjectTemplate.class,
          response.group,
          response.timestamp,
          keycloak
        )
      )
      useEntitiesStore.getState().loadResourceFinished(resource.key)
    }
    return true
  }

/**
 * A thunk that completes loading a resource after a template has been selected.
 * This is used when a resource doesn't have a template ID and the user selects one via modal.
 */
export const completeResourceLoadingWithTemplate =
  (resourceTemplateId) => (dispatch) => {
    const pending = useEditorStore.getState().pendingResourceTemplateSelection
    if (!pending) {
      console.error("No pending resource template selection found")
      return Promise.resolve(false)
    }

    const { uri, dataset, response, asNewResource, errorKey, keycloak } =
      pending

    // Clear pending state
    useEditorStore.getState().clearPendingResourceTemplateSelection()

    // Load the resource with the selected template
    return dispatch(
      addResourceFromDataset(
        dataset,
        uri,
        resourceTemplateId,
        errorKey,
        asNewResource,
        _.pick(response, ["group", "editGroups"])
      )
    )
      .then(([resource, usedDataset]) => {
        const unusedDataset = dataset.difference(usedDataset)
        useEditorStore
          .getState()
          .setUnusedRDF(
            resource.key,
            unusedDataset.size > 0 ? unusedDataset.toCanonical() : null
          )
        dispatch(loadRelationships(resource.key, uri, errorKey))
        const result = [response, resource, unusedDataset]
        return dispatch(
          dispatchResourceForEditor(result, uri, { asNewResource }, keycloak)
        )
      })
      .catch((err) => {
        if (err.name !== "ResourceTemplateError") {
          console.error(err)
          useEditorStore
            .getState()
            .addError(
              errorKey,
              `Error retrieving ${uri}: ${err.message || err}`
            )
        }
        return false
      })
  }

export const loadResourceForPreview =
  (uri, errorKey, { version = null } = {}) =>
  (dispatch) =>
    dispatch(loadResource(uri, errorKey, { version })).then((result) =>
      dispatch(dispatchResourceForPreview(result))
    )

export const dispatchResourceForPreview = (result) => () => {
  if (!result) return false
  const [, resource] = result
  useEditorStore.getState().setCurrentPreviewResource(resource.key)
  return true
}

export const loadResourceForDiff =
  (uri, errorKey, diffType, { version = null } = {}) =>
  (dispatch) =>
    dispatch(loadResource(uri, errorKey, { version })).then((result) => {
      if (!result) return false
      const [, resource] = result
      // diffType: compareFromResourceKey or compareToResourceKey
      if (diffType === "compareFromResourceKey") {
        useEditorStore
          .getState()
          .setCurrentDiffResources(resource.key, undefined)
      } else {
        useEditorStore
          .getState()
          .setCurrentDiffResources(undefined, resource.key)
      }
      return true
    })

/**
 * A thunk that creates a new resource from a resource template and adds to state.
 * @return {boolean} true if successful
 */
export const newResource =
  (resourceTemplateId, errorKey, setCurrent = true, keycloak) =>
  (dispatch) => {
    useEditorStore.getState().clearErrors(errorKey)
    return dispatch(addEmptyResource(resourceTemplateId, errorKey))
      .then((resource) => {
        useEditorStore
          .getState()
          .setCurrentComponent(
            resource.key,
            resource.properties[0].key,
            resource.properties[0].key
          )
        if (setCurrent)
          useEditorStore.getState().setCurrentEditResource(resource.key)
        useEditorStore.getState().setUnusedRDF(resource.key, null)
        useHistoryStore.getState().addTemplateHistory(resource.subjectTemplate)
        dispatch(addUserTemplateHistory(resourceTemplateId, keycloak))
        // This will mark the resource has unchanged.
        useEntitiesStore.getState().loadResourceFinished(resource.key)
        return resource.key
      })
      .catch((err) => {
        // ResourceTemplateErrors have already been dispatched.
        if (err.name !== "ResourceTemplateError") {
          console.error(err)
          useEditorStore
            .getState()
            .addError(
              errorKey,
              `Error creating new resource: ${err.message || err}`
            )
        }
        return false
      })
  }

/**
 * A thunk that creates a new resource from an existing in-state resource and adds to state.
 */
export const newResourceCopy = (resourceKey) => (dispatch) =>
  dispatch(newSubjectCopy(resourceKey))
    .then((newResource) => {
      useEntitiesStore.getState().addSubject(newResource)
      useEditorStore
        .getState()
        .setCurrentComponent(
          newResource.key,
          newResource.properties[0].key,
          newResource.properties[0].key
        )
      useEditorStore.getState().setCurrentEditResource(newResource.key)
      useEditorStore.getState().setUnusedRDF(newResource.key, null)
    })
    .catch((err) => {
      console.error(err)
    })

/**
 * A thunk that loads a resource from N3 data and adds to state.
 * @param {rdf.Dataset} dataset containing the resource.
 * @param {string} URI for the resource.
 * @param {string} resourceTemplateId if known.
 * @param {string} errorKey
 * @param {boolean} asNewResource if true, does not set URI for the resource.
 * @return {boolean} true if successful
 */
export const newResourceFromDataset =
  (dataset, uri, resourceTemplateId, errorKey, asNewResource) => (dispatch) => {
    const newResourceTemplateId =
      resourceTemplateId ||
      resourceTemplateIdFromDataset(chooseURI(dataset, uri), dataset)
    return dispatch(
      addResourceFromDataset(
        dataset,
        uri,
        newResourceTemplateId,
        errorKey,
        asNewResource
      )
    )
      .then(([resource, usedDataset]) => {
        const unusedDataset = dataset.difference(usedDataset)
        useEditorStore
          .getState()
          .setUnusedRDF(
            resource.key,
            unusedDataset.size > 0 ? unusedDataset.toCanonical() : null
          )
        useEditorStore.getState().setCurrentEditResource(resource.key)
        if (!asNewResource)
          useEntitiesStore.getState().loadResourceFinished(resource.key)
        return true
      })
      .catch((err) => {
        // ResourceTemplateErrors have already been dispatched.
        if (err.name !== "ResourceTemplateError") {
          console.error(err)
          useEditorStore
            .getState()
            .addError(
              errorKey,
              `Error retrieving ${resourceTemplateId}: ${err.message || err}`
            )
        }
        return false
      })
  }

// A thunk that publishes (saves) a new resource
export const saveNewResource =
  (resourceKey, group, editGroups, errorKey, keycloak) => (dispatch) => {
    const resource = selectFullSubject(useEntitiesStore.getState(), resourceKey)
    const currentUser = useAuthenticateStore.getState().user
    const unusedRDF = useEditorStore.getState().unusedRDF[resourceKey]

    useEditorStore.getState().clearErrors(errorKey)

    return postResource(
      resource,
      currentUser,
      group,
      editGroups,
      keycloak,
      unusedRDF
    )
      .then((resourceUrl) => {
        useEntitiesStore.getState().setBaseURL(resourceKey, resourceUrl)
        useEntitiesStore
          .getState()
          .setResourceGroup(resourceKey, group, editGroups)
        useEditorStore.getState().saveResourceFinished(resourceKey, Date.now())
        dispatch(addUserResourceHistory(resourceUrl, keycloak))
        dispatch(
          addResourceHistory(resourceUrl, resource.subjectTemplate.class, group)
        )
      })
      .catch((err) => {
        console.error(err)
        useEditorStore
          .getState()
          .addError(
            errorKey,
            `Error saving new resource: ${err.message || err}`
          )
      })
  }

// A thunk that saves an existing resource
export const saveResource =
  (resourceKey, group, editGroups, errorKey, keycloak) => (dispatch) => {
    const resource = selectFullSubject(useEntitiesStore.getState(), resourceKey)
    const currentUser = useAuthenticateStore.getState().user
    const unusedRDF = useEditorStore.getState().unusedRDF[resourceKey]

    useEditorStore.getState().clearErrors(errorKey)

    return putResource(
      resource,
      currentUser,
      group,
      editGroups,
      null,
      keycloak,
      unusedRDF
    )
      .then(() => {
        useEntitiesStore
          .getState()
          .setResourceGroup(resourceKey, group, editGroups)
        useEditorStore.getState().saveResourceFinished(resourceKey, Date.now())
        dispatch(addUserResourceHistory(resource.uri, keycloak))
        dispatch(
          addResourceHistory(
            resource.uri,
            resource.subjectTemplate.class,
            resource.group
          )
        )
        useEntitiesStore.getState().clearVersions(resourceKey)
      })
      .catch((err) => {
        console.error(err)
        useEditorStore
          .getState()
          .addError(errorKey, `Error saving: ${err.message || err}`)
      })
  }

/**
 * A thunk that expands a property based on resource template and adds to state.
 * Note that this is NOT showing/hiding a property.
 */
export const expandProperty = (propertyKey, errorKey) => (dispatch) => {
  const property = selectProperty(useEntitiesStore.getState(), propertyKey)
  let promises
  if (property.propertyTemplate.type === "resource") {
    promises = property.propertyTemplate.valueSubjectTemplateKeys.map(
      (resourceTemplateId) =>
        dispatch(newSubject(null, resourceTemplateId, {}, errorKey)).then(
          (subject) =>
            dispatch(newPropertiesFromTemplates(subject, false, errorKey)).then(
              (properties) => {
                subject.properties = properties
                const newValue = newValueSubject(
                  property,
                  property.propertyTemplate.defaultUri,
                  subject
                )
                useEntitiesStore.getState().addValue(newValue)
              }
            )
        )
    )
  } else {
    property.values = defaultValuesFor(property)
    if (!_.isEmpty(property.values)) property.show = true
    promises = [
      useEntitiesStore
        .getState()
        .addProperty(
          _.pick(property, [
            "key",
            "subjectKey",
            "propertyTemplateKey",
            "propertyUri",
            "show",
            "values",
          ])
        ),
    ]
  }
  return Promise.all(promises).then(() =>
    useEntitiesStore.getState().showProperty(property.key)
  )
}

/**
 * A thunk that clears the values from a property from state (the opposite of expandProperty).
 * Note that this is NOT showing/hiding a property.
 */
export const contractProperty = (propertyKey) => () => {
  const property = selectNormProperty(useEntitiesStore.getState(), propertyKey)
  if (!property) return

  // Remove existing values
  const oldValueKeys = property.valueKeys || []
  oldValueKeys.forEach((valueKey) => {
    useEntitiesStore.getState().removeValue(valueKey)
  })

  // Hide property (the removeValue calls above already removed valueKeys entries;
  // set valueKeys to null to indicate contracted state)
  useEntitiesStore.setState((prev) => ({
    properties: {
      ...prev.properties,
      [propertyKey]: {
        ...prev.properties[propertyKey],
        valueKeys: null,
        show: false,
      },
    },
  }))
}

/**
 * A thunk that adds a new value subject that is based on an existing value subject (i.e., "add another").
 */
export const addSiblingValueSubject = (valueKey, errorKey) => (dispatch) => {
  const value = selectValue(useEntitiesStore.getState(), valueKey)
  return dispatch(
    newSubject(null, value.valueSubject.subjectTemplate.id, {}, errorKey)
  ).then((subject) =>
    dispatch(newPropertiesFromTemplates(subject, false, errorKey)).then(
      (properties) => {
        subject.properties = properties
        const newValue = newValueSubject(
          value.property,
          value.propertyUri,
          subject
        )
        useEntitiesStore.getState().addValue(newValue, valueKey)
      }
    )
  )
}

/**
 * A thunk that resets a nested resource value to a fresh blank subject of the same template.
 */
export const resetValueSubject = (valueKey, errorKey) => (dispatch) => {
  const value = selectValue(useEntitiesStore.getState(), valueKey)
  const templateId = value.valueSubject.subjectTemplate.id
  return dispatch(newSubject(null, templateId, {}, errorKey)).then((subject) =>
    dispatch(newPropertiesFromTemplates(subject, false, errorKey)).then(
      (properties) => {
        subject.properties = properties
        const newValue = newValueSubject(
          value.property,
          value.propertyUri,
          subject
        )
        useEntitiesStore.getState().addValue(newValue, valueKey)
        useEntitiesStore.getState().removeValue(valueKey)
      }
    )
  )
}

export const addMainTitle = (resourceKey, mainTitle) => () => {
  const property = selectMainTitleProperty(
    useEntitiesStore.getState(),
    resourceKey
  )
  if (!property) return

  if (_.isEmpty(property.valueKeys)) {
    const value = newLiteralValue(
      property,
      mainTitle.propertyUri,
      mainTitle.literal,
      mainTitle.lang
    )
    useEntitiesStore.getState().addValue(value)
    return
  }

  useEntitiesStore.getState().updateValue({
    valueKey: property.valueKeys[0],
    literal: mainTitle.literal || null,
    lang: mainTitle.lang || null,
  })
}
