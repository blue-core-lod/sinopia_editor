// Copyright 2019 Stanford University see LICENSE for license

import React, { useEffect, useState } from "react"
import PropTypes from "prop-types"
import { useDispatch } from "react-redux"
import { Link } from "react-router-dom"
import { newResource } from "actionCreators/resources"
import useEditorStore from "stores/editorStore"
import _ from "lodash"
import Config from "Config"
import usePermissions from "hooks/usePermissions"
import useAlerts from "hooks/useAlerts"
import { useKeycloak } from "../../KeycloakContext"
import LoadingButton from "../buttons/LoadingButton"

const NewResourceTemplateButton = (props) => {
  const dispatch = useDispatch()
  const { keycloak } = useKeycloak()
  const { canCreate } = usePermissions()
  const errorKey = useAlerts()
  const [isLoading, setIsLoading] = useState(false)

  const errors = useEditorStore((state) => state.errors[errorKey])
  const resourceKey = useEditorStore((state) => state.currentResource)

  const [navigateEditor, setNavigateEditor] = useState(false)

  useEffect(() => {
    // Forces a wait until the root resource has been set in state
    if (navigateEditor && resourceKey && _.isEmpty(errors)) {
      props.history.push("/editor")
    }
  }, [navigateEditor, resourceKey, props.history, errors])

  const handleClick = (event) => {
    event.preventDefault()
    setIsLoading(true)
    dispatch(
      newResource(Config.rootResourceTemplateId, errorKey, true, keycloak)
    ).then((result) => {
      setNavigateEditor(result)
    })
  }

  if (!canCreate) return null
  if (isLoading) return <LoadingButton />

  return (
    <Link
      to={{ pathname: "/editor", state: {} }}
      onClick={(e) => handleClick(e)}
    >
      <button className="btn btn-primary" style={{ marginTop: "10px" }}>
        New template
      </button>
    </Link>
  )
}

NewResourceTemplateButton.propTypes = {
  history: PropTypes.object,
}

export default NewResourceTemplateButton
