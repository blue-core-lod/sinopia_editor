import React, { useState, useEffect, useRef } from "react"
import PropTypes from "prop-types"
import suggest from "utilities/LocSuggest"
import fetchSubjectDetails from "utilities/LocSubjectDetails"

// Parse the LOC suggest2 API response object into item objects.
// Response shape: { hits: [{ suggestLabel, aLabel, uri, ... }], ... }
const parseResults = (resp, kind) => {
  const hits = resp?.hits
  if (!Array.isArray(hits)) return []
  return hits
    .map((hit) => {
      const label = hit.aLabel || hit.suggestLabel || ""
      if (!label) return null
      const uri = hit.uri || ""
      return {
        label,
        suggestLabel: hit.suggestLabel || label,
        uri,
        id: uri.split("/").pop(),
        kind,
      }
    })
    .filter(Boolean)
}

// Recursively extract a display label from a parsed RDF object or string value
const extractLabel = (val) => {
  if (!val) return null
  if (typeof val === "string") return val
  if (val.authoritativeLabel)
    return typeof val.authoritativeLabel === "string"
      ? val.authoritativeLabel
      : null
  // rdf:resource attribute style: { resource: "uri" }
  if (val.resource) return val.resource.split("/").pop()
  // Nested MADS type, e.g. { Topic: { about: "...", authoritativeLabel: "..." } }
  const madsTypes = [
    "Topic",
    "ComplexSubject",
    "Authority",
    "Name",
    "Geographic",
    "GenreForm",
    "Temporal",
    "CorporateName",
    "PersonalName",
  ]
  for (const t of madsTypes) {
    if (val[t]) return extractLabel(val[t])
  }
  if (val.about) return val.about.split("/").pop()
  return null
}

const toArray = (val) => {
  if (!val) return []
  return Array.isArray(val) ? val : [val]
}

const extractRefs = (val) => toArray(val).map(extractLabel).filter(Boolean)

const DetailSection = ({ heading, children }) => {
  if (!children) return null
  return (
    <div className="lcsh-detail-section">
      <strong>{heading}:</strong>
      {children}
    </div>
  )
}

DetailSection.propTypes = {
  heading: PropTypes.string.isRequired,
  children: PropTypes.node,
}

const LcshTypeahead = ({ query, onSelect }) => {
  const [simpleResults, setSimpleResults] = useState([])
  const [complexResults, setComplexResults] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedKind, setSelectedKind] = useState(null)
  const [details, setDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [show, setShow] = useState(false)
  const timerRef = useRef(null)

  // Fetch suggest results when query changes (debounced, ≥3 chars)
  useEffect(() => {
    if (!query || query.length < 3) {
      setSimpleResults([])
      setComplexResults([])
      setSelectedId(null)
      setDetails(null)
      setShow(false)
      return
    }

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      Promise.all([
        suggest(query, "SimpleType"),
        suggest(query, "ComplexSubject"),
      ])
        .then(([simpleResp, complexResp]) => {
          const simple = parseResults(simpleResp, "simple")
          const complex = parseResults(complexResp, "complex")
          setSimpleResults(simple)
          setComplexResults(complex)
          const hasResults = simple.length > 0 || complex.length > 0
          setShow(hasResults)
          if (hasResults) {
            const first = simple[0] || complex[0]
            setSelectedId(first.id)
            setSelectedKind(first.kind)
          }
        })
        .catch((err) => console.error("[LcshTypeahead] suggest error:", err))
    }, 300)

    return () => clearTimeout(timerRef.current)
  }, [query])

  // Fetch details whenever the selected result changes
  useEffect(() => {
    if (!selectedId) {
      setDetails(null)
      return
    }
    setLoadingDetails(true)
    fetchSubjectDetails(selectedId)
      .then((data) => {
        setDetails(Array.isArray(data) ? data[0] : data)
        setLoadingDetails(false)
      })
      .catch(() => {
        setDetails(null)
        setLoadingDetails(false)
      })
  }, [selectedId])

  if (!show) return null

  const handleClickItem = (item) => {
    setSelectedId(item.id)
    setSelectedKind(item.kind)
    onSelect(item.label)
  }

  const renderResultItem = (item, isFirst) => {
    const isSelected = selectedId === item.id
    return (
      <button
        key={item.uri || item.label}
        type="button"
        className={`lcsh-result-item${
          isSelected ? " lcsh-result-item--selected" : ""
        }`}
        onClick={() => handleClickItem(item)}
      >
        <span className="lcsh-result-marker" aria-hidden="true">
          {isFirst ? ">" : "·"}
        </span>
        {item.suggestLabel}
      </button>
    )
  }

  const renderGroup = (items, heading, firstIsFirst) => {
    if (!items.length) return null
    return (
      <div className="lcsh-result-group">
        <div className="lcsh-result-group-heading">{heading}</div>
        {items.map((item, i) =>
          renderResultItem(item, firstIsFirst && i === 0)
        )}
      </div>
    )
  }

  const renderDetails = () => {
    if (loadingDetails) {
      return (
        <div className="lcsh-details-loading text-muted small">Loading…</div>
      )
    }
    if (!details) return null

    const label =
      typeof details.authoritativeLabel === "string"
        ? details.authoritativeLabel
        : null
    const subjectKindLabel =
      selectedKind === "complex"
        ? "Complex Subject"
        : selectedKind === "simple"
        ? "Simple Subject"
        : null
    const locUrl = details.about
      ? `https://id.loc.gov/authorities/subjects/${selectedId}`
      : null

    const notes = [
      ...toArray(details.note),
      ...toArray(details.editorialNote),
    ].filter((n) => typeof n === "string")

    const sources = toArray(details.hasSource)
      .map((item) => {
        const src = item?.Source
        if (!src) return null
        const citation =
          typeof src.citationSource === "string"
            ? src.citationSource.trim()
            : null
        if (!citation) return null
        const status =
          typeof src.citationStatus === "string" ? src.citationStatus : ""
        return status ? `${status}: ${citation}` : citation
      })
      .filter(Boolean)

    // Variants: may be direct variantLabel strings or nested via hasVariant
    // hasVariant wraps a typed element (Topic, Geographic, etc.) — search one level deep
    const extractVariantLabel = (item) => {
      if (!item || typeof item !== "object") return null
      if (typeof item.variantLabel === "string") return item.variantLabel
      for (const val of Object.values(item)) {
        if (
          val &&
          typeof val === "object" &&
          typeof val.variantLabel === "string"
        )
          return val.variantLabel
      }
      return null
    }

    const variants = [
      ...toArray(details.variantLabel).filter((v) => typeof v === "string"),
      ...toArray(details.hasVariant).map(extractVariantLabel).filter(Boolean),
    ]

    // skos:related → rdf:Description → skos:prefLabel (namespace-stripped to "related"/"Description"/"prefLabel")
    const related = toArray(details.related)
      .map((item) => {
        const label = item?.Description?.prefLabel
        return typeof label === "string" ? label : null
      })
      .filter(Boolean)
    const broader = extractRefs(details.hasBroaderAuthority)

    // Classification may be a string or nested object
    const classRaw = details.classification
    const classifications = toArray(classRaw)
      .map((c) => (typeof c === "string" ? c : extractLabel(c)))
      .filter(Boolean)

    return (
      <div className="lcsh-details">
        <div className="lcsh-details-header">
          {label && <span className="lcsh-details-label">{label}</span>}
        </div>

        {selectedId && (
          <div className="lcsh-details-id">
            {selectedId}
            {locUrl && (
              <>
                {" "}
                <a
                  href={locUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="small"
                >
                  view on id.loc.gov
                </a>
              </>
            )}
          </div>
        )}

        {subjectKindLabel && (
          <div className="lcsh-subject-kind">
            <strong>{subjectKindLabel}</strong>
          </div>
        )}

        <DetailSection heading="Notes">
          {notes.length > 0 && (
            <ul className="lcsh-detail-list">
              {notes.map((n, i) => (
                <li key={i}>• {n}</li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection heading="Variants">
          {variants.length > 0 && (
            <ul className="lcsh-detail-list">
              {variants.map((v, i) => (
                <li key={i}>• {v}</li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection heading="Related">
          {related.length > 0 && (
            <ul className="lcsh-detail-list">
              {related.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection heading="Sources">
          {sources.length > 0 && (
            <ul className="lcsh-detail-list">
              {sources.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection heading="LC Classification">
          {classifications.length > 0 && (
            <ul className="lcsh-detail-list">
              {classifications.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection heading="Has Broader Authority">
          {broader.length > 0 && (
            <ul className="lcsh-detail-list">
              {broader.map((b, i) => (
                <li key={i}>• {b}</li>
              ))}
            </ul>
          )}
        </DetailSection>
      </div>
    )
  }

  const firstIsFirst = simpleResults.length > 0

  return (
    <div className="lcsh-typeahead">
      <div className="row g-0">
        <div className="col-5">
          <div
            className="lcsh-results-list"
            role="listbox"
            aria-label="LCSH suggestions"
          >
            {renderGroup(simpleResults, "Simple", firstIsFirst)}
            {renderGroup(complexResults, "Complex", !firstIsFirst)}
          </div>
        </div>
        <div className="col-7 lcsh-details-col">{renderDetails()}</div>
      </div>
    </div>
  )
}

LcshTypeahead.propTypes = {
  query: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
}

export default LcshTypeahead
