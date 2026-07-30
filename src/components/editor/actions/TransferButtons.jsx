import React, { useMemo } from "react"
import { useSelector, useDispatch } from "react-redux"
import PropTypes from "prop-types"
import { selectNormSubject } from "selectors/resources"
import { selectGroups } from "selectors/authenticate"
import Config from "Config"
import TransferModal from "./TransferModal"
import { showModal } from "actions/modals"
import useAlerts from "hooks/useAlerts"
import { isBfInstance } from "utilities/Bibframe"
import _ from "lodash"

const TransferButtons = ({ resourceKey }) => {
  const dispatch = useDispatch()
  const errorKey = useAlerts()
  const resource = useSelector((state) => selectNormSubject(state, resourceKey))
  const userGroups = useSelector((state) => selectGroups(state))

  const transferTargets = useMemo(() => {
    const newTargets = []
    Object.entries(Config.transferConfig).forEach(([target, targetConfig]) => {
      Object.entries(targetConfig).forEach(([group, label]) => {
        if (userGroups.includes(group)) newTargets.push([target, group, label])
      })
    })
    return newTargets
  }, [userGroups])

  // Resource must be saved
  if (!resource?.uri) return null

  // Resource must be a bf:Instance
  if (!isBfInstance(resource?.classes)) return null

  // Must be targets
  if (_.isEmpty(transferTargets)) return null

  const buttons = transferTargets.map(([target, group, label]) => {
    const modalName = `TransferModal-${target}-${group}-${resourceKey}`

    const handleClick = (event) => {
      dispatch(showModal(modalName))
      event.preventDefault()
    }

    return (
      <React.Fragment key={`${group}-${target}`}>
        <TransferModal
          modalName={modalName}
          label={label}
          resourceUri={resource.uri}
          errorKey={errorKey}
        />
        <button
          type="button"
          className="btn btn-secondary btn-no-outline"
          onClick={handleClick}
        >
          {`Export to ${label}`}
        </button>
      </React.Fragment>
    )
  })

  return (
    <React.Fragment>
      {buttons} <div className="separator-circle">•</div>
    </React.Fragment>
  )
}

TransferButtons.propTypes = {
  resourceKey: PropTypes.string.isRequired,
}

export default TransferButtons
