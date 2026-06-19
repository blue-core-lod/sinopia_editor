// Copyright 2019 Stanford University see LICENSE for license

import React, { useState, useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import PropTypes from "prop-types"
import PreviewModal from "../preview/PreviewModal"
import { selectRelationships } from "selectors/relationships"
import { fetchResource } from "sinopiaApi"
import rdf from "rdf-ext"
import { labelFromDataset } from "utilities/Bibframe"
import { addError } from "actions/errors"
import RelationshipRow from "./RelationshipRow"
import useAlerts from "hooks/useAlerts"
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

const RelationshipsDisplay = ({ resourceKey, displayActions = true }) => {
  const dispatch = useDispatch()
  const errorKey = useAlerts()

  const [resourceRowMaps, setResourceRowMaps] = useState({})
  const [isMounted, setMounted] = useState(true)
  // Note that when loading a new resource the inferred refs may arrive asynchronously, which means the refs
  // may change during the lifecycle of the component.
  const { bfAdminMetadataRefs, bfItemRefs, bfInstanceRefs, bfWorkRefs } =
    useSelector((state) => selectRelationships(state, resourceKey), _.isEqual)

  useEffect(() => () => setMounted(false), [])

  useEffect(() => {
    const uris = [
      ...bfAdminMetadataRefs,
      ...bfItemRefs,
      ...bfInstanceRefs,
      ...bfWorkRefs,
    ]
    if (_.isEmpty(uris)) return
    Promise.all(
      uris.map((refUri) =>
        fetchResource(refUri)
          .then(([dataset, response]) =>
            rowFromDataset(refUri, dataset, response)
          )
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
      setResourceRowMaps((prev) => ({
        ...prev,
        [resourceKey]: newResourceRowMap,
      }))
    })
  }, [
    bfAdminMetadataRefs,
    bfItemRefs,
    bfInstanceRefs,
    bfWorkRefs,
    isMounted,
    resourceKey,
    errorKey,
    dispatch,
  ])

  const relationshipList = (label, refs) => {
    const resourceRowMap = resourceRowMaps[resourceKey]
    if (_.isEmpty(refs) || _.isEmpty(resourceRowMap)) return null
    const refItems = refs.map((ref) => {
      const row = resourceRowMap[ref]
      if (!row) return null
      return (
        <RelationshipRow
          key={ref}
          displayActions={displayActions}
          row={row}
          errorKey={errorKey}
        />
      )
    })
    return (
      <React.Fragment>
        <h5>{label}</h5>
        <ul>{refItems}</ul>
      </React.Fragment>
    )
  }

  if (!resourceRowMaps[resourceKey])
    return <div className="relationships-nav">Loading ...</div>

  return (
    <React.Fragment>
      {displayActions && <PreviewModal errorKey={errorKey} />}

      <div className="relationships-nav">
        {relationshipList("Works", bfWorkRefs)}
        {relationshipList("Instances", bfInstanceRefs)}
        {relationshipList("Items", bfItemRefs)}
        {relationshipList("Admin Metadata", bfAdminMetadataRefs)}
      </div>
    </React.Fragment>
  )
}

RelationshipsDisplay.propTypes = {
  resourceKey: PropTypes.string.isRequired,
  displayActions: PropTypes.bool,
}

export default RelationshipsDisplay
