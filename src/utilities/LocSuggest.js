import Config from "Config"

/**
 * Queries the LOC Suggest Service.
 * @param {string} query - The search string
 * @param {string} type - Either "SimpleType" or "ComplexSubject"
 * @param {number} [offset=0] - Pagination offset
 * @return {Promise<Object>} JSON results from the LOC Suggest Service
 */
const suggest = (query, type, offset = 0) => {
  const urlParams = new URLSearchParams({
    q: query,
    rdftype: type,
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
