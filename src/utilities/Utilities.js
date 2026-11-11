// Copyright 2018, 2019 Stanford University see LICENSE for license

import N3Parser from "n3/lib/N3Parser"
import rdf from "rdf-ext"
import _ from "lodash"
import CryptoJS from "crypto-js"
import { JsonLdParser } from "jsonld-streaming-parser"
import { Writer as N3Writer } from "n3"
import dateFormat from "date-and-time"
import Config from "Config"

const Readable = require("stream").Readable

export const isResourceWithValueTemplateRef = (property) =>
  property?.type === "resource" &&
  property?.valueConstraint?.valueTemplateRefs?.length > 0

export const resourceToName = (uri) => {
  if (!_.isString(uri)) return undefined

  const index = uri.lastIndexOf("/")

  if (index === -1) return uri

  return uri.substr(index + 1)
}

export const isValidURI = (value) => {
  try {
    /* eslint no-new: 'off' */
    new URL(value)
    return true
  } catch {
    return false
  }
}

export const isHttp = (uri) =>
  _.startsWith(uri, "http://") || _.startsWith(uri, "https://")

/**
 * Determines whether a URI identifies a Blue Core resource, i.e. one that can
 * be fetched as application/vnd.sinopia+json. Blue Core resources share an
 * origin with the Blue Core API; external URIs (e.g. id.loc.gov) do not.
 * Note: the API base includes a path (.../api) while resources are siblings
 * (.../instances, .../works, ...), so we compare origin rather than prefix.
 * @param {string} uri to test
 * @return {boolean} true if the URI is a Blue Core resource URI
 */
export const isBlueCoreUri = (uri) => {
  try {
    return new URL(uri).origin === new URL(Config.sinopiaApiBase).origin
  } catch {
    return false
  }
}

/**
 * Derives the editor route ID for a resource from its URI. Blue Core resource
 * URIs are <origin>/<collection>/<uuid> (e.g. .../works/<uuid>), and the
 * collection is needed to fetch the resource again, so the ID is
 * "<collection>/<uuid>".
 * @param {string} uri of the resource
 * @return {string|null} "<collection>/<uuid>", or null if the URI has no such path
 */
export const resourceIdFromUri = (uri) => {
  let segments
  try {
    segments = new URL(uri).pathname.split("/").filter(Boolean)
  } catch {
    return null
  }
  if (segments.length < 2) return null
  return segments.slice(-2).join("/")
}

/**
 * Inverse of resourceIdFromUri: rebuilds a Blue Core resource URI from its
 * collection and uuid. Like isBlueCoreUri, assumes resources share an origin
 * with the Blue Core API.
 * @param {string} collection e.g. "works"
 * @param {string} id the resource uuid
 * @return {string} the resource URI
 */
export const uriFromResourceId = (collection, id) =>
  `${new URL(Config.sinopiaApiBase).origin}/${collection}/${id}`

/**
 * Loads N3 into a dataset.
 * @param {string} data that is the N3
 * @param {string} [baseIRI] base IRI against which relative IRIs (e.g., <>) are resolved
 * @return {Promise<rdf.Dataset>} a promise that resolves to the loaded dataset
 */
// Blank node labels are kept as written (the parser would otherwise prefix
// them), so a node keeps its identity between the record, the unused RDF and
// the triples rebuilt from the form.
export const datasetFromN3 = (data, baseIRI) =>
  new Promise((resolve, reject) => {
    const parser = new N3Parser({ factory: rdf, baseIRI, blankNodePrefix: "" })
    const dataset = rdf.dataset()
    parser.parse(data, (err, quad) => {
      if (err) {
        reject(err)
      }
      // the final time through this loop will be EOF and quad will be undefined
      if (quad) {
        dataset.add(quad)
      } else {
        // done parsing
        resolve(dataset)
      }
    })
  })

export const n3FromDataset = (dataset, format) =>
  new Promise((resolve, reject) => {
    const writer = new N3Writer({
      format: format === "n-triples" ? "N-Triples" : undefined,
    })
    writer.addQuads(dataset.toArray())
    writer.end((error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
  })

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
const XSD_STRING = "http://www.w3.org/2001/XMLSchema#string"

const jsonldIdFor = (term) =>
  term.termType === "BlankNode" ? `_:${term.value}` : term.value

const jsonldObjectFor = (term) => {
  if (term.termType !== "Literal") return { "@id": jsonldIdFor(term) }
  if (term.language) return { "@value": term.value, "@language": term.language }
  if (term.datatype.value === XSD_STRING) return { "@value": term.value }
  return { "@value": term.value, "@type": term.datatype.value }
}

// Expanded JSON-LD with one node object per subject, so that every blank node
// keeps its label. jsonld.fromRDF would fold RDF lists into @list, and the
// list cells would come back with new labels.
export const jsonldFromDataset = (dataset) => {
  const nodes = new Map()
  dataset.forEach(({ subject, predicate, object }) => {
    const id = jsonldIdFor(subject)
    if (!nodes.has(id)) nodes.set(id, { "@id": id })
    const node = nodes.get(id)
    if (predicate.value === RDF_TYPE && object.termType === "NamedNode") {
      node["@type"] = [...(node["@type"] || []), object.value]
    } else {
      node[predicate.value] = [
        ...(node[predicate.value] || []),
        jsonldObjectFor(object),
      ]
    }
  })
  return Promise.resolve([...nodes.values()])
}

// The JSON-LD parser passes a native value through untouched when it carries
// an explicit @type, so {"@type": "xsd:integer", "@value": 0} becomes a
// literal whose value is the number 0. RDF/JS literal values are strings, and
// the editor treats a falsy literal as empty, so a stored 0 would not load.
const withStringLiteralValue = (quad) => {
  const { object } = quad
  if (object.termType !== "Literal" || _.isString(object.value)) return quad
  return rdf.quad(
    quad.subject,
    quad.predicate,
    rdf.literal(String(object.value), object.language || object.datatype),
    quad.graph,
  )
}

export const datasetFromJsonld = (jsonld) => {
  const parserJsonld = new JsonLdParser()

  const input = new Readable({
    read: () => {
      input.push(JSON.stringify(jsonld))
      input.push(null)
    },
  })

  const output = parserJsonld.import(input)
  const dataset = rdf.dataset()

  output.on("data", (quad) => {
    dataset.add(withStringLiteralValue(quad))
  })

  return new Promise((resolve, reject) => {
    output.on("end", resolve)
    output.on("error", reject)
  }).then(() => dataset)
}

export const generateMD5 = (message) => CryptoJS.MD5(message).toString()

// True for a profile template whose version could not be resolved. Such a
// template cannot be named by sinopia:hasResourceTemplate, which must pin a
// profile version (GraphBuilder.addGeneratedByTriple), so a resource made with
// it cannot be saved.
export const hasUnknownTemplateVersion = (subjectTemplate) =>
  !!subjectTemplate.profileUri && !subjectTemplate.versionUri

export const findRootResourceTemplateId = (resourceURI, dataset) => {
  const rtQuads = dataset
    .match(
      rdf.namedNode(resourceURI),
      rdf.namedNode("http://sinopia.io/vocabulary/hasResourceTemplate"),
    )
    .toArray()
  if (rtQuads.length !== 1) {
    return null
  }
  return rtQuads[0].object.value
}

export const hasQuadsForRootResourceTemplateId = (resourceURI, dataset) => {
  const rtQuads = dataset.match(rdf.namedNode(resourceURI)).toArray()
  return rtQuads.length > 0
}

export const datasetFromRdf = (rdf) => {
  // Try parsing as JSON.
  let json
  try {
    json = JSON.parse(rdf)
  } catch {
    return datasetFromN3(rdf)
  }
  return datasetFromJsonld(json)
}

export const emptyValue = (value) =>
  !value.literal && !value.uri && !value.valueSubjectKey

export const isInViewport = (elem) => {
  // Adapted from https://gomakethings.com/how-to-test-if-an-element-is-in-the-viewport-with-vanilla-javascript/
  if (!elem) return false
  const bounding = elem.getBoundingClientRect()
  return (
    bounding.top >= 0 &&
    bounding.left >= 0 &&
    bounding.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    bounding.right <=
      (window.innerWidth || document.documentElement.clientWidth)
  )
}

export const isTopInViewport = (elem) => {
  // Adapted from https://gomakethings.com/how-to-test-if-an-element-is-in-the-viewport-with-vanilla-javascript/
  if (!elem) return false
  const bounding = elem.getBoundingClientRect()
  return (
    bounding.top >= 0 &&
    bounding.top <=
      (window.innerHeight || document.documentElement.clientHeight)
  )
}

export const stickyScrollIntoView = (
  targetSelector,
  headerSelector = "#sticky-resource-header",
) => {
  const elem = document.querySelector(targetSelector)
  if (isTopInViewport(elem)) return
  const stickyHeader = document.querySelector(headerSelector)
  // do not scroll to top, leave space for sticky header
  const y =
    elem.getBoundingClientRect().top +
    window.pageYOffset -
    stickyHeader.clientHeight
  window.scrollTo({ top: y, behavior: "smooth" })
}

// This is UTC.
export const formatISODate = (date) => date.toISOString().slice(0, 10)

// This is local timezone.
export const formatLocalDate = (date) => dateFormat.format(date, "YYYY-MM-DD")
