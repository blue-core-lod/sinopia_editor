import React, { useState, useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import PropTypes from "prop-types"
import { selectSearchRelationships } from "selectors/relationships"
import { fetchResource } from "sinopiaApi"
import rdf from "rdf-ext"
import { labelFromDataset } from "utilities/Bibframe"
import useAlerts from "hooks/useAlerts"
import usePermissions from "hooks/usePermissions"
import SearchResultRow from "./SearchResultRow"
import { addError } from "actions/errors"
import _ from "lodash"

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"

const rowFromDataset = (uri, dataset, response) => ({
  uri,
  label: labelFromDataset(uri, dataset) ?? uri,
  type: dataset
    .match(rdf.namedNode(uri), rdf.namedNode(RDF_TYPE), null)
    .toArray()
    .map((q) => q.object.value),
  modified: response.timestamp,
  group: response.group,
  editGroups: response.editGroups ?? [],
})

const RelationshipResults = ({ uri }) => {
  const dispatch = useDispatch()
  const errorKey = useAlerts()
  const relationships = useSelector((state) =>
    selectSearchRelationships(state, uri)
  )
  const { canEdit, canCreate } = usePermissions()

  const [resourceRowMap, setResourceRowMap] = useState({})
  const [isMounted, setMounted] = useState(true)

  useEffect(() => () => setMounted(false), [])

  useEffect(() => {
    if (_.isEmpty(relationships)) return
    const uris = [
      ...relationships.bfItemRefs,
      ...relationships.bfInstanceRefs,
      ...relationships.bfWorkRefs,
    ]
    if (_.isEmpty(uris)) return
    Promise.all(
      uris.map((refUri) =>
        fetchResource(refUri)
          .then(([dataset, response]) => rowFromDataset(refUri, dataset, response))
          .catch((err) => {
            dispatch(
              addError(
                errorKey,
                `Error getting relationship ${refUri}: ${err.message || err}`
              )
            )
            return null
          })
      )
    ).then((rows) => {
      if (!isMounted) return
      const newResourceRowMap = {}
      rows.forEach((row) => {
        if (row) newResourceRowMap[row.uri] = row
      })
      setResourceRowMap(newResourceRowMap)
    })
  }, [relationships, isMounted, errorKey, dispatch])

  const relationshipList = (label, refs) => {
    if (_.isEmpty(refs)) return null
    const refRows = refs.map((ref) => {
      const row = resourceRowMap[ref]
      if (!row) return null
      return (
        <SearchResultRow
          key={row.uri}
          row={row}
          canCreate={canCreate}
          canEdit={canEdit(row)}
          withRelationships={false}
        />
      )
    })
    return (
      <div className="search-relationship">
        <h5 className="ps-3">{label}</h5>
        <table className="table table-bordered table-light mb-0">
          <colgroup>
            <col span="1" />
            <col span="1" style={{ width: "30%" }} />
            <col span="1" style={{ width: "10%" }} />
            <col span="1" style={{ width: "10%" }} />
          </colgroup>
          <tbody>{refRows}</tbody>
        </table>
      </div>
    )
  }

  if (_.isEmpty(relationships)) return null

  if (_.isEmpty(resourceRowMap)) {
    return <div>Loading ...</div>
  }

  return (
    <div>
      {relationshipList("Works", relationships.bfWorkRefs)}
      {relationshipList("Instances", relationships.bfInstanceRefs)}
      {relationshipList("Items", relationships.bfItemRefs)}
      {relationshipList("Admin Metadata", relationships.bfAdminMetadataRefs)}
    </div>
  )
}

RelationshipResults.propTypes = {
  uri: PropTypes.string.isRequired,
}

export default RelationshipResults
