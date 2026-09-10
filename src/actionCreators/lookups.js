import { selectLookup } from "selectors/lookups"
import useEntitiesStore from "stores/entitiesStore"
import { nanoid } from "nanoid"
import _ from "lodash"

// A thunk that fetches a lookup, transforms it, and adds to state.
export const fetchLookup = (uri) => (dispatch) => {
  const existingLookup = selectLookup(useEntitiesStore.getState(), uri)
  if (existingLookup) {
    return existingLookup
  }

  if (uri.startsWith("file:")) return dispatch(fetchFileLookup(uri))

  return dispatch(fetchHttpLookup(uri))
}

const fetchFileLookup = (uri) => () => {
  /* eslint security/detect-non-literal-require: 'off' */
  const lookupJson = require(`../../static/${uri.substring(6)}`)
  const opts = lookupJson.map((authority) => ({
    id: nanoid(),
    label: authority.label,
    uri: authority.uri,
  }))
  useEntitiesStore.getState().lookupOptionsRetrieved(uri, opts)
  return opts
}

const fetchHttpLookup = (uri) => () => {
  const url = `${uri}.json`
  return fetch(url)
    .then((resp) => resp.json())
    .then((json) => responseToOptions(json))
    .then((opts) => {
      useEntitiesStore.getState().lookupOptionsRetrieved(uri, opts)
      return opts
    })
    .catch((err) => {
      console.error(`Error fetching ${url}: ${err.message || err}`)
      const opts = [
        {
          isError: true,
        },
      ]
      useEntitiesStore.getState().lookupOptionsRetrieved(uri, opts)
      return opts
    })
}

const responseToOptions = (json) => {
  const opts = []
  for (const i in json) {
    try {
      const newId = nanoid()
      const item = Object.getOwnPropertyDescriptor(json, i)
      const uri = item.value["@id"]
      const labels =
        item.value["http://www.loc.gov/mads/rdf/v1#authoritativeLabel"]
      labels.forEach((label) =>
        opts.push({ id: newId, label: label["@value"], uri })
      )
    } catch (err) {
      // Ignore
    }
  }

  return _.uniqBy(opts, (opt) => opt.uri)
}

export const noop = () => {}
