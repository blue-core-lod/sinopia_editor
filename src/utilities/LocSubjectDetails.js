import Config from "Config"

/**
 * Recursively converts an XML element to a plain JS object.
 * Element and attribute names are stripped of their namespace prefix so that,
 * e.g., `madsrdf:authoritativeLabel` becomes `authoritativeLabel`.
 * When the same local name appears more than once the values are collected
 * into an array, preserving hierarchy for nested elements.
 *
 * @param {Element} el
 * @returns {Object}
 */
const elementToJson = (el) => {
  const obj = {}

  for (const attr of el.attributes) {
    obj[attr.localName] = attr.value
  }

  for (const child of el.children) {
    const key = child.localName
    // Prefer text content for leaf elements that have attributes (e.g. xml:lang)
    // but no child elements. Void elements (empty text) still use elementToJson
    // so their attributes (e.g. rdf:resource) are preserved.
    const value =
      child.children.length > 0
        ? elementToJson(child)
        : child.attributes.length > 0 && child.textContent.trim()
          ? child.textContent.trim()
          : child.attributes.length > 0
            ? elementToJson(child)
            : child.textContent

    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (!Array.isArray(obj[key])) obj[key] = [obj[key]]
      obj[key].push(value)
    } else {
      obj[key] = value
    }
  }

  return obj
}

/**
 * Fetches the RDF record for an LOC subject and returns a JSON representation
 * with namespace prefixes removed from all field names.
 *
 * @param {string} id - The LOC subject identifier, e.g. "sh2008110277"
 * @returns {Promise<Object|Object[]>} Parsed JSON. A single top-level resource
 *   is returned as an object; multiple top-level resources as an array.
 */
const fetchSubjectDetails = (id) =>
  fetch(`${Config.locSubjectUrl}${id}.rdf`)
    .then((resp) => {
      if (!resp.ok)
        throw new Error(`LOC subject details returned ${resp.statusText}`)
      return resp.text()
    })
    .then((xmlText) => {
      const doc = new DOMParser().parseFromString(xmlText, "application/xml")
      const parseError = doc.querySelector("parsererror")
      if (parseError)
        throw new Error(`Failed to parse RDF: ${parseError.textContent}`)

      const resources = Array.from(doc.documentElement.children).map(
        (child) => ({ type: child.localName, ...elementToJson(child) })
      )

      return resources.length === 1 ? resources[0] : resources
    })
    .catch((err) => {
      console.error(
        `Error fetching LOC subject details: ${err.message || err}`
      )
      throw err
    })

export default fetchSubjectDetails
