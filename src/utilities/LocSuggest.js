import Config from "Config"

/**
 * Queries the LOC Suggest Service.
 * @param {string} query - The search string
 * @param {string} type - Either "SimpleType" or "ComplexSubject"
 * @param {number} [offset=0] - Pagination offset
 * @param {string} [memberOf] - MADS/RDF collection URI to restrict results to
 * @return {Promise<Object>} JSON results from the LOC Suggest Service
 */
const suggest = (query, type, offset = 0, memberOf) => {
  const params = { q: query }
  if (type) params.rdftype = type
  if (memberOf) params.memberOf = memberOf
  const urlParams = new URLSearchParams({
    ...params,
    count: 25,
    offset,
    searchtype: "left",
  })

  return fetch(`${Config.locSuggestBaseUrl}?${urlParams}`)
    .then((resp) => {
      if (!resp.ok)
        throw new Error(`LOC Suggest Service returned ${resp.statusText}`)
      return resp.json()
    })
    .catch((err) => {
      console.error(`Error querying LOC Suggest Service: ${err.message || err}`)
      throw err
    })
}

export default suggest
