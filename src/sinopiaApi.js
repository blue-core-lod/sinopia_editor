// Copyright 2019 Stanford University see LICENSE for license

import {
  datasetFromJsonld,
  datasetFromN3,
  jsonldFromDataset,
} from "utilities/Utilities"
import Config from "Config"
/* eslint-disable node/no-unpublished-import */
import {
  hasFixtureResource,
  getFixtureResource,
  getFixtureResourceVersions,
  getFixtureResourceRelationships,
} from "../__tests__/testUtilities/fixtureLoaderHelper"
import GraphBuilder from "GraphBuilder"
import { isBfWork, isBfInstance, isBfHub } from "utilities/Bibframe"
import rtLiteralPropertyAttrs from "../static/templates/rt_literal_property_attrs_doc.json"
import rtLookupPropertyAttrs from "../static/templates/rt_lookup_property_attrs_doc.json"
import rtPropertyTemplate from "../static/templates/rt_property_template_doc.json"
import rtResourcePropertyAttrs from "../static/templates/rt_resource_property_attrs_doc.json"
import rtResourceRemplate from "../static/templates/rt_resource_template_doc.json"
import rtUriPropertyAttrs from "../static/templates/rt_uri_property_attrs_doc.json"
import {
  checkResp,
  getJson,
  isTemplate,
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
      headers: { Accept: "application/vnd.sinopia+json" },
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
export const getGroups = () =>
  Promise.resolve([{ id: "blue core", label: "Blue Core" }])

// Sends a serialized resource body to the Blue Core API with the appropriate
// auth header. Shared by postResource and putResource.
const sendResourceBody = (url, body, method, keycloak) => {
  const jwt = getJwt(keycloak)
  return fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body,
  })
}

// Determines the Blue Core API collection a new resource should be POSTed to,
// based on its class. The server mints the uri and returns it in the response.
const apiCollectionPathFor = (resource) => {
  if (isTemplate(resource)) return "profiles"
  const classes = [resource.subjectTemplate.class]
  if (isBfWork(classes)) return "works"
  if (isBfInstance(classes)) return "instances"
  if (isBfHub(classes)) return "hubs"
  return "resources"
}

// Publishes (saves) a new resource by POSTing to the appropriate Blue Core API
// collection endpoint. The resource is sent without a uri (blank node subject) so
// the API mints one; the minted uri is read from the response and returned.
export const postResource = (
  resource,
  currentUser,
  group,
  editGroups,
  keycloak,
  unusedRDF = null
) => {
  const newResource = { ...resource, group, editGroups }
  const url = `${Config.sinopiaApiBase}/${apiCollectionPathFor(resource)}/`
  return saveBodyForResource(
    newResource,
    currentUser.username,
    group,
    editGroups,
    true,
    unusedRDF
  ).then((body) =>
    sendResourceBody(url, body, "POST", keycloak)
      .then((resp) => checkResp(resp))
      .then((resp) => resp.json())
      .then((json) => json.uri)
  )
}

// Saves an existing resource
export const putResource = (
  resource,
  currentUser,
  group,
  editGroups,
  method,
  keycloak,
  unusedRDF = null
) =>
  saveBodyForResource(
    resource,
    currentUser.username,
    group,
    editGroups,
    false,
    unusedRDF
  ).then((body) =>
    sendResourceBody(resource.uri, body, method || "PUT", keycloak).then(
      (resp) => checkResp(resp).then(() => true)
    )
  )

export const deleteResource = (uri, keycloak) => {
  const jwt = getJwt(keycloak)
  return fetch(uri, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  }).then((resp) => checkResp(resp))
}

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
  const doPut = () =>
    fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: historyItemPayload }),
    })
  return doPut().then((resp) => {
    if (resp.status === 404)
      return postUser(userId, keycloak).then(() =>
        doPut().then((resp2) => checkResp(resp2).then(() => resp2.json()))
      )
    return checkResp(resp).then(() => resp.json())
  })
}

export const postTransfer = (resourceUri, keycloak) => {
  const url = `${Config.sinopiaApiBase}/export`
  const jwt = getJwt(keycloak)

  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ instance_uri: resourceUri }),
  }).then((resp) => checkResp(resp))
}

const userUrlFor = (userId) =>
  `${Config.sinopiaApiBase}/user/${encodeURI(userId)}`

const saveBodyForResource = (
  resource,
  user,
  group,
  editGroups,
  useBlankNode = false,
  unusedRDF = null
) => {
  const dataset = new GraphBuilder(resource, useBlankNode).graph

  // Merge back any triples that the template did not cover on load so they are
  // preserved rather than stripped on save. See issue #134.
  const mergeUnused = unusedRDF
    ? datasetFromN3(unusedRDF).then((unusedDataset) =>
        dataset.addAll(unusedDataset)
      )
    : Promise.resolve()

  return mergeUnused
    .then(() => jsonldFromDataset(dataset))
    .then((jsonld) =>
      JSON.stringify({
        data: JSON.stringify(jsonld),
        // user,
        // group,
        // editGroups,
        // templateId: resource.subjectTemplate.id,
        // types: [resource.subjectTemplate.class],
        // bfAdminMetadataRefs: resource.bfAdminMetadataRefs,
        // sinopiaLocalAdminMetadataForRefs: resource.localAdminMetadataForRefs,
        // bfItemRefs: resource.bfItemRefs,
        // bfInstanceRefs: resource.bfInstanceRefs,
        // bfWorkRefs: resource.bfWorkRefs,
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
