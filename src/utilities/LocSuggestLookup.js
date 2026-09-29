import suggest from "utilities/LocSuggest"
import { findAuthorityConfig } from "utilities/authorityConfig"

// Fields of a suggest2 hit's `more` object worth showing to a cataloger, in the
// order they should appear. The service omits a key entirely when it has no
// values, so every one of these is optional.
const contextFields = [
  ["notes", "Note"],
  ["variantLabels", "Variant label"],
  ["broaders", "Broader"],
  ["relateds", "Related"],
  ["sources", "Source"],
  ["marcKeys", "MARC"],
]

// lcclasses entries are objects, not strings: { classuri, code, label }.
const lcClassValues = (classes) =>
  (Array.isArray(classes) ? classes : [])
    .map((item) => {
      if (typeof item === "string") return item
      const code = item?.code
      const label = item?.label
      if (code && label) return `${code} — ${label}`
      return code || label || null
    })
    .filter(Boolean)

const asValues = (raw) => {
  if (raw === undefined || raw === null) return []
  return (Array.isArray(raw) ? raw : [raw]).filter(
    (value) => typeof value === "string" && value.trim()
  )
}

/**
 * Builds the `context` array that RenderLookupContext displays beneath a result.
 * The identifier goes first: suggest2 regularly returns several headings sharing
 * an identical label (e.g. two distinct "Management" authorities), so the label
 * alone cannot tell them apart.
 */
const contextFor = (hit) => {
  const more = hit.more || {}
  const context = [{ property: "ID", values: [hit.uri] }]

  contextFields.forEach(([key, property]) => {
    const values = asValues(more[key])
    if (values.length) context.push({ property, values })
  })

  const lcClasses = lcClassValues(more.lcclasses)
  if (lcClasses.length)
    context.push({ property: "LC classification", values: lcClasses })

  return context
}

const adaptHits = (hits) =>
  (Array.isArray(hits) ? hits : [])
    .map((hit) => {
      const label = hit.aLabel || hit.suggestLabel
      if (!label || !hit.uri) return null
      return {
        uri: hit.uri,
        id: hit.token || hit.uri,
        label,
        context: contextFor(hit),
      }
    })
    .filter(Boolean)

/**
 * Queries the LOC Suggest Service for one authority config and returns the
 * result in the shape LookupTab expects.
 *
 * The rdftype comes from the authority's entry in authorityConfig.json rather
 * than from the authority object handed down by the template, because
 * TemplatesBuilder.newAuthorities copies only a fixed set of fields. Reading the
 * canonical config here means a new LCSH flavour is a config entry and needs no
 * code change.
 */
const getLocSuggestLookupResult = (query, authorityConfig, options) => {
  const config = findAuthorityConfig(authorityConfig.uri)
  const rdftype = config?.rdftype
  if (!rdftype)
    return Promise.resolve({
      error: `No rdftype configured for ${authorityConfig.uri}`,
    })

  return suggest(query, rdftype, options.startOfRange)
    .then((response) => {
      const results = adaptHits(response?.hits)
      return {
        authorityConfig,
        results,
        // suggest2 reports the total number of matches as `count`, distinct from
        // `pagesize`, which is how many this page asked for.
        totalHits: Number.isInteger(response?.count)
          ? response.count
          : results.length,
      }
    })
    .catch((err) => ({ error: err.message || String(err) }))
}

export default getLocSuggestLookupResult
