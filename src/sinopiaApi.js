// Copyright 2019 Stanford University see LICENSE for license

import { datasetFromJsonld, jsonldFromDataset } from "utilities/Utilities"
import Config from "Config"
/* eslint-disable node/no-unpublished-import */
import {
  hasFixtureResource,
  getFixtureResource,
  getFixtureResourceVersions,
  getFixtureResourceRelationships,
} from "../__tests__/testUtilities/fixtureLoaderHelper"
import GraphBuilder from "GraphBuilder"
import { v4 as uuidv4 } from "uuid"
import rtLiteralPropertyAttrs from "../static/templates/rt_literal_property_attrs_doc.json"
import rtLookupPropertyAttrs from "../static/templates/rt_lookup_property_attrs_doc.json"
import rtPropertyTemplate from "../static/templates/rt_property_template_doc.json"
import rtResourcePropertyAttrs from "../static/templates/rt_resource_property_attrs_doc.json"
import rtResourceRemplate from "../static/templates/rt_resource_template_doc.json"
import rtUriPropertyAttrs from "../static/templates/rt_uri_property_attrs_doc.json"
import {
  checkResp,
  getJsonData,
  getJson,
  isTemplate,
  templateIdFor,
  getJwt,
} from "./utilities/SinopiaApiHelper"

const baseTemplates = {
  "sinopia:template:property:literal": rtLiteralPropertyAttrs,
  "sinopia:template:property:lookup": rtLookupPropertyAttrs,
  "sinopia:template:property": rtPropertyTemplate,
  "sinopia:template:property:resource": rtResourcePropertyAttrs,
  "sinopia:template:resource": rtResourceRemplate,
  "sinopia:template:property:uri": rtUriPropertyAttrs,
}

/**
 * Fetches a resource from the Sinopia API.
 * @return {Promise{[rdf.Dataset, Object]} resource as dataset, response JSON.
 * @throws when error occurs retrieving or parsing the resource template.
 */
export const fetchResource = (
  uri,
  { isTemplate = false, version = null } = {}
) => {
  const fetchUri = encodeURI(version ? `${uri}/version/${version}` : uri)

  let fetchPromise
  // Templates have special handling when using fixtures.
  // A template will raise when found; other resources will try API.
  // Note that ignoring version of fixtures.
  if (Config.useResourceTemplateFixtures && hasFixtureResource(uri)) {
    try {
      fetchPromise = Promise.resolve(getFixtureResource(uri))
    } catch (err) {
      fetchPromise = Promise.reject(err)
    }
  } else if (isBaseTemplateUri(uri)) {
    fetchPromise = loadBaseTemplate(uri)
  } else if (Config.useResourceTemplateFixtures && isTemplate) {
    fetchPromise = Promise.reject(new Error("Not found"))
  } else {
    fetchPromise = fetch(fetchUri, {
      headers: { Accept: "application/json" },
    }).then((resp) => checkResp(resp).then(() => resp.json()))
  }

  return fetchPromise
    .then((response) =>
      Promise.all([datasetFromJsonld(response.data), Promise.resolve(response)])
    )
    .catch((err) => {
      throw new Error(`Error parsing resource: ${err.message || err}`)
    })
}

const isBaseTemplateUri = (uri) =>
  uri.startsWith(`${Config.sinopiaApiBase}/resource/sinopia:template:`)

const loadBaseTemplate = (uri) => {
  const templateId = uri.slice(`${Config.sinopiaApiBase}/resource/`.length)
  const template = baseTemplates[templateId]

  // Insert the expected URI for base subject.
  const baseNode = template.find((node) => node["@id"] === templateId)
  if (baseNode) baseNode["@id"] = uri

  return Promise.resolve({ data: template })
}

export const fetchResourceVersions = (uri) => {
  if (Config.useResourceTemplateFixtures && hasFixtureResource(uri)) {
    return Promise.resolve(getFixtureResourceVersions())
  }
  return getJson(`${uri}/versions`).then((json) => json.versions)
}

export const fetchResourceRelationships = (uri) => {
  if (Config.useResourceTemplateFixtures && hasFixtureResource(uri)) {
    return Promise.resolve(getFixtureResourceRelationships())
  }

  return getJson(`${uri}/relationships`)
}

// Fetches list of groups
export const getGroups = () => getJsonData(`${Config.sinopiaApiBase}/groups`)

// Publishes (saves) a new resource
export const postResource = (
  resource,
  currentUser,
  group,
  editGroups,
  keycloak
) => {
  const newResource = { ...resource }
  // Mint a uri. Resource templates use the template id.
  const resourceId = isTemplate(resource) ? templateIdFor(resource) : uuidv4()
  const uri = `${Config.sinopiaApiBase}/resource/${resourceId}`
  newResource.uri = uri
  newResource.group = group
  newResource.editGroups = editGroups
  return putResource(
    newResource,
    currentUser,
    group,
    editGroups,
    "POST",
    keycloak
  ).then(() => uri)
}

// Saves an existing resource
export const putResource = (
  resource,
  currentUser,
  group,
  editGroups,
  method,
  keycloak
) =>
  saveBodyForResource(resource, currentUser.username, group, editGroups).then(
    (body) => {
      const jwt = getJwt(keycloak)
      return fetch(resource.uri, {
        method: method || "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body,
      }).then((resp) => checkResp(resp).then(() => true))
    }
  )

export const postMarc = (resourceUri, keycloak) => {
  const url = resourceUri.replace("resource", "marc")
  const jwt = getJwt(keycloak)
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  }).then((resp) =>
    checkResp(resp).then(() => resp.headers.get("Content-Location"))
  )
}

export const getMarcJob = (marcJobUrl) =>
  fetch(marcJobUrl).then((resp) =>
    checkResp(resp).then(() => {
      // Will return 200 if job is not yet completed.
      // Will return 303 if job completed. Fetch automatically redirects,
      // which retrieves the MARC text.
      if (!resp.redirected) return [undefined, undefined]
      return resp.text().then((body) => [resp.url, body])
    })
  )

export const getMarc = (marcUrl, asText) =>
  fetch(marcUrl, {
    headers: {
      Accept: asText ? "text/plain" : "application/marc",
    },
  }).then((resp) => checkResp(resp).then(() => resp.blob()))

export const fetchUser = (userId, keycloak) =>
  fetch(userUrlFor(userId), {
    headers: {
      Accept: "application/json",
    },
  }).then((resp) => {
    if (resp.status === 404) return postUser(userId, keycloak)
    return checkResp(resp).then(() => resp.json())
  })

const postUser = (userId, keycloak) => {
  const jwt = getJwt(keycloak)
  return fetch(userUrlFor(userId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  }).then((resp) => checkResp(resp).then(() => resp.json()))
}

export const putUserHistory = (
  userId,
  historyType,
  historyItemKey,
  historyItemPayload,
  keycloak
) => {
  const url = `${userUrlFor(userId)}/history/${historyType}/${encodeURI(
    historyItemKey
  )}`
  const jwt = getJwt(keycloak)
  return fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: historyItemPayload }),
  }).then((resp) => checkResp(resp).then(() => resp.json()))
}

export const postTransfer = (resourceUri, group, target, keycloak) => {
  const url = `${resourceUri.replace(
    "resource",
    "transfer"
  )}/${group}/${target}`
  const jwt = getJwt(keycloak)
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  }).then((resp) => checkResp(resp))
}

const userUrlFor = (userId) =>
  `${Config.sinopiaApiBase}/user/${encodeURI(userId)}`

const saveBodyForResource = (resource, user, group, editGroups) => {
  const dataset = new GraphBuilder(resource).graph

  return jsonldFromDataset(dataset).then((jsonld) =>
    JSON.stringify({
      data: jsonld,
      user,
      group,
      editGroups,
      templateId: resource.subjectTemplate.id,
      types: [resource.subjectTemplate.class],
      bfAdminMetadataRefs: resource.bfAdminMetadataRefs,
      sinopiaLocalAdminMetadataForRefs: resource.localAdminMetadataForRefs,
      bfItemRefs: resource.bfItemRefs,
      bfInstanceRefs: resource.bfInstanceRefs,
      bfWorkRefs: resource.bfWorkRefs,
    })
  )
}

export const detectLanguage = (text, keycloak) => {
  if (Config.useResourceTemplateFixtures) {
    return Promise.resolve([
      {
        language: "en",
        score: 0.9719234108924866,
      },
    ])
  }
  const jwt = getJwt(keycloak)
  return fetch(`${Config.sinopiaApiBase}/helpers/langDetection`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "text/plain",
    },
    body: text,
  })
    .then((resp) => checkResp(resp).then(() => resp.json()))
    .then((json) => json.data)
}
