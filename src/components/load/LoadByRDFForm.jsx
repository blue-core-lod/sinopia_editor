// Copyright 2019 Stanford University see LICENSE for license

import React, { useState, useEffect } from "react"
import { useDispatch } from "react-redux"
import {
  datasetFromRdf,
  findRootResourceTemplateId,
  hasQuadsForRootResourceTemplateId,
} from "utilities/Utilities"
import useRdfResource from "hooks/useRdfResource"
import { clearErrors, addError } from "actions/errors"
import { showModal } from "actions/modals"
import ResourceTemplateChoiceModal from "../ResourceTemplateChoiceModal"
import useAlerts from "hooks/useAlerts"
import { useHistory } from "react-router-dom"
import { useKeycloak } from "../../KeycloakContext"
import { getJwt } from "utilities/SinopiaApiHelper"
import _ from "lodash"

const prettyXml = (xml) => {
  const doc = new DOMParser().parseFromString(xml, "application/xml")
  const serialize = (node, depth) => {
    const indent = "  ".repeat(depth)
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim()
      return text ? `${indent}${text}` : ""
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return ""
    const tag = node.tagName
    const attrs = Array.from(node.attributes)
      .map((a) => ` ${a.name}="${a.value}"`)
      .join("")
    const children = Array.from(node.childNodes)
      .map((n) => serialize(n, depth + 1))
      .filter(Boolean)
    if (children.length === 0) return `${indent}<${tag}${attrs}/>`
    if (children.length === 1 && !children[0].includes("\n"))
      return `${indent}<${tag}${attrs}>${children[0].trim()}</${tag}>`
    return `${indent}<${tag}${attrs}>\n${children.join("\n")}\n${indent}</${tag}>`
  }
  const root = doc.documentElement
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serialize(root, 0)}`
}

const LoadByRDFForm = () => {
  const dispatch = useDispatch()
  const errorKey = useAlerts()
  const { keycloak } = useKeycloak()
  const history = useHistory()

  const [baseURI, setBaseURI] = useState("")
  const [rdf, setRdf] = useState("")
  const [dataset, setDataset] = useState(false)
  const [resourceTemplateId, setResourceTemplateId] = useState("")
  const [marcText, setMarcText] = useState("")
  const [isConvertingMarc, setIsConvertingMarc] = useState(false)
  const [isMarcBibframe, setIsMarcBibframe] = useState(false)
  useRdfResource(dataset, baseURI, resourceTemplateId, errorKey)

  const handleMarcFileChange = (event) => {
    const file = event.target.files[0]
    if (!file) return

    setIsConvertingMarc(true)
    setMarcText("")
    dispatch(clearErrors(errorKey))

    const reader = new FileReader()
    reader.onload = (e) => {
      fetch("/api/marc2xml", {
        method: "POST",
        headers: {
          "Content-Type": "application/marc",
          Authorization: `Bearer ${getJwt(keycloak)}`,
        },
        body: e.target.result,
      })
        .then((resp) => {
          if (!resp.ok)
            throw new Error(`marc2xml service returned ${resp.statusText}`)
          return resp.text()
        })
        .then((marcXml) => {
          setMarcText(prettyXml(marcXml))
          return fetch("/api/marc2bibframe", {
            method: "POST",
            headers: {
              "Content-Type": "application/xml",
              Authorization: `Bearer ${getJwt(keycloak)}`,
            },
            body: marcXml,
          })
        })
        .then((resp) => {
          if (!resp.ok)
            throw new Error(`marc2bibframe service returned ${resp.statusText}`)
          return resp.text()
        })
        .then((rdfText) => {
          setRdf(rdfText)
          setIsMarcBibframe(true)
        })
        .catch((err) =>
          dispatch(
            addError(
              errorKey,
              `Error converting MARC: ${err.message || err}`
            )
          )
        )
        .finally(() => setIsConvertingMarc(false))
    }
    reader.readAsArrayBuffer(file)
  }

  // Passed into resource template chooser to allow it to pass back selected resource template id.
  const chooseResourceTemplate = (resourceTemplateId) => {
    setResourceTemplateId(resourceTemplateId)
  }

  useEffect(() => {
    // Clear resource template id so that useRdfResource doesn't trigger with previous resource template id.
    setResourceTemplateId(null)
    // Clear errors
    if (!dataset) dispatch(clearErrors(errorKey))
  }, [dispatch, dataset, errorKey])

  const changeRdf = (event) => {
    dispatch(clearErrors(errorKey))
    setRdf(event.target.value)
    setIsMarcBibframe(false)
    // This will get set on submit.
    setDataset(false)
    event.preventDefault()
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setDataset(false)
    dispatch(clearErrors(errorKey))

    if (isMarcBibframe) {
      fetch("/api/works", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getJwt(keycloak)}`,
        },
        body: JSON.stringify({ data: rdf }),
      })
        .then((resp) => {
          if (!resp.ok)
            throw new Error(`Error creating work: ${resp.statusText}`)
          return resp.json()
        })
        .then((json) => {
          console.log("/api/works response:", json)
          history.push(`/editor/${json.uuid}`)
        })
        .catch((err) =>
          dispatch(addError(errorKey, `Error creating work: ${err.message || err}`))
        )
      return
    }

    // Try parsing
    datasetFromRdf(rdf)
      .then((newDataset) => {
        // Determine if base URI must be provided.
        if (!hasQuadsForRootResourceTemplateId(baseURI, newDataset)) {
          dispatch(addError(errorKey, "Base URI must be provided."))
          return
        }

        // Determine if need to ask for resource template id.
        const resourceTemplateId = findRootResourceTemplateId(
          baseURI,
          newDataset
        )
        if (resourceTemplateId) {
          setResourceTemplateId(resourceTemplateId)
        } else {
          dispatch(showModal("ResourceTemplateChoiceModal"))
        }
        setDataset(newDataset)
      })
      .catch((err) => {
        dispatch(addError(errorKey, `Error parsing: ${err}`))
      })
  }

  const rdfPlaceHolder = `For example:
<> <http://id.loc.gov/ontologies/bibframe/mainTitle> "Tractatus Logico-Philosophicus"@eng .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:bf2:WorkTitle" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Title> .
  `

  const baseURIPlaceholder =
    "For example: https://api.sinopia.io/resource/e111a712-5a45-4c2a-9201-289b98d7452e."

  return (
    <div>
      <h3>Load MARC into Editor</h3>
      <p className="text-muted">Convert a MARC record to MARCXML</p>
      <div className="mb-3">
        <label htmlFor="marcFileInput">Choose MARC file</label>
        <input
          type="file"
          className="form-control"
          id="marcFileInput"
          accept=".mrc"
          onChange={handleMarcFileChange}
        />
      </div>
      <div className="mb-3">
        <label htmlFor="marcTextArea">
          {isConvertingMarc ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              Converting&hellip;
            </>
          ) : (
            "MARCXML output"
          )}
        </label>
        <textarea
          className="form-control"
          id="marcTextArea"
          rows="15"
          value={marcText}
          onChange={(event) => setMarcText(event.target.value)}
          placeholder="Upload a .mrc file above to convert to MARCXML."
          disabled={isConvertingMarc}
        ></textarea>
      </div>
      <hr />
      <h3>Load RDF into Editor</h3>
      <form id="loadForm" onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="resourceTextArea">
            RDF (Accepts JSON-LD, Turtle, TriG, N-Triples, N-Quads, and
            Notation3 (N3))
          </label>
          <textarea
            className="form-control"
            id="resourceTextArea"
            rows="15"
            value={rdf}
            onChange={(event) => changeRdf(event)}
            placeholder={rdfPlaceHolder}
          ></textarea>
          <p />
        </div>
        <div className="mb-3">
          <label htmlFor="uriInput">
            Base URI (Omit brackets. If base URI is &lt;&gt;, leave blank.)
          </label>
          <input
            type="url"
            className="form-control"
            id="uriInput"
            value={baseURI}
            onChange={(event) => setBaseURI(event.target.value)}
            placeholder={baseURIPlaceholder}
          />
          <p />
        </div>
        <p className="text-muted">
          Clicking &ldquo;Submit&rdquo; will create a new resource that can be
          saved in Sinopia.
        </p>
        <button
          type="submit"
          disabled={_.isEmpty(rdf)}
          className="btn btn-primary"
        >
          Submit
        </button>
      </form>
      <ResourceTemplateChoiceModal choose={chooseResourceTemplate} />
    </div>
  )
}

export default LoadByRDFForm
