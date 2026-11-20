// Copyright 2019 Stanford University see LICENSE for license

import React, { useCallback, useEffect, useRef, useState } from "react"
import PropTypes from "prop-types"
import { useDispatch, useSelector } from "react-redux"
import Config from "Config"
import {
  selectHistoricalResources,
  selectHistoricalTemplates,
} from "selectors/history"
import {
  resourceHasChangesSinceLastSave,
  selectCurrentResourceKey,
  selectNormSubject,
  selectResourceKeys,
} from "selectors/resources"
import { selectSubjectTemplateForSubject } from "selectors/templates"
import { removeResourceHistory, removeTemplateHistory } from "actions/history"
import { setCurrentResource } from "actions/resources"
import { showModal } from "actions/modals"
import useResource from "hooks/useResource"
import useEditor from "hooks/useEditor"
import useAlerts from "hooks/useAlerts"
import usePermissions from "hooks/usePermissions"
import CloseResourceModal from "./actions/CloseResourceModal"

const BADGES = { work: "W", instance: "I", template: "RT" }

const BF = "http://id.loc.gov/ontologies/bibframe/"

// Blue Core keeps works and instances in their own collections, so a saved
// resource's kind is in its URI. Anything else (hubs, templates opened as
// resources) is left out of the row.
const kindForUri = (uri) => {
  if (!uri) return null
  if (/\/works\/[^/]+$/.test(uri)) return "work"
  if (/\/instances\/[^/]+$/.test(uri)) return "instance"
  return null
}

const kindForSubjectTemplate = (subjectTemplate) => {
  if (subjectTemplate?.id === Config.rootResourceTemplateId) return "template"
  if (subjectTemplate?.class === `${BF}Work`) return "work"
  if (subjectTemplate?.class === `${BF}Instance`) return "instance"
  return "other"
}

const ArrowIcon = () => (
  <svg width="10" height="19" viewBox="0 0 10 19" aria-hidden="true">
    <path
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.79021 0.214666C9.85671 0.28254 9.90947 0.363172 9.94547 0.451943C9.98147 0.540714 10 0.63588 10 0.73199C10 0.8281 9.98147 0.923266 9.94547 1.01204C9.90947 1.10081 9.85671 1.18144 9.79021 1.24931L1.72512 9.50019L9.79021 17.7511C9.9243 17.8883 9.99963 18.0744 9.99963 18.2684C9.99963 18.4624 9.9243 18.6485 9.79021 18.7857C9.65612 18.9229 9.47425 19 9.28462 19C9.09499 19 8.91313 18.9229 8.77904 18.7857L0.209794 10.0175C0.143292 9.94964 0.0905301 9.86901 0.0545301 9.78024C0.0185301 9.69147 0 9.5963 0 9.50019C0 9.40408 0.0185301 9.30892 0.0545301 9.22015C0.0905301 9.13137 0.143292 9.05074 0.209794 8.98287L8.77904 0.214666C8.84537 0.14662 8.92417 0.0926328 9.01093 0.0557969C9.09768 0.018961 9.19069 0 9.28462 0C9.37855 0 9.47156 0.018961 9.55831 0.0557969C9.64507 0.0926328 9.72387 0.14662 9.79021 0.214666Z"
    />
  </svg>
)

const Chip = ({ kind, label, onOpen, onRemove, removeLabel, isLoading }) => (
  <li className={`recently-opened-item recently-opened-${kind}`}>
    <button
      type="button"
      className="recently-opened-open"
      title={label}
      onClick={onOpen}
      aria-busy={isLoading || undefined}
    >
      {BADGES[kind] && (
        <span className="recently-opened-badge" aria-hidden="true">
          <span>{BADGES[kind]}</span>
        </span>
      )}
      <span className="recently-opened-label">{label}</span>
    </button>
    <button
      type="button"
      className="recently-opened-remove"
      aria-label={removeLabel}
      title={removeLabel}
      onClick={onRemove}
    >
      <span aria-hidden="true">&times;</span>
    </button>
  </li>
)

Chip.propTypes = {
  kind: PropTypes.string.isRequired,
  label: PropTypes.string,
  onOpen: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  removeLabel: PropTypes.string.isRequired,
  isLoading: PropTypes.bool,
}

const ResourceChip = ({ resource, kind }) => {
  const dispatch = useDispatch()
  const errorKey = useAlerts()
  const { handleEdit, isLoadingEdit } = useResource(errorKey, {
    resourceURI: resource.uri,
  })
  const label = resource.label || resource.uri

  return (
    <Chip
      kind={kind}
      label={label}
      onOpen={handleEdit}
      onRemove={() => dispatch(removeResourceHistory(resource.uri))}
      removeLabel={`Remove ${label} from recently opened`}
      isLoading={isLoadingEdit}
    />
  )
}

ResourceChip.propTypes = {
  resource: PropTypes.object.isRequired,
  kind: PropTypes.string.isRequired,
}

const TemplateChip = ({ template }) => {
  const dispatch = useDispatch()
  const errorKey = useAlerts()
  const { canEdit, hasRole } = usePermissions()
  const { handleEdit, handleView, isLoadingEdit, isLoadingView } = useResource(
    errorKey,
    {
      resourceURI: template.originalURI || template.uri,
      resourceTemplateId: template.id,
    },
  )
  // Same rule as the templates page: editing a template needs template_edit
  const canEditTemplate = canEdit(template) && hasRole("template_edit")
  const label = template.resourceLabel || template.id

  return (
    <Chip
      kind="template"
      label={label}
      onOpen={canEditTemplate ? handleEdit : handleView}
      onRemove={() => dispatch(removeTemplateHistory(template.id))}
      removeLabel={`Remove ${label} from recently opened`}
      isLoading={isLoadingEdit || isLoadingView}
    />
  )
}

TemplateChip.propTypes = {
  template: PropTypes.object.isRequired,
}

// An open resource the history row does not show: a new or copied resource,
// which has no URI until it is saved, or a saved one that is not a work or an
// instance (e.g. a hub). It is listed so it stays reachable, and its X closes it.
const OpenChip = ({ resourceKey }) => {
  const dispatch = useDispatch()
  const subject = useSelector((state) => selectNormSubject(state, resourceKey))
  const subjectTemplate = useSelector((state) =>
    selectSubjectTemplateForSubject(state, resourceKey),
  )
  const hasChanged = useSelector((state) =>
    resourceHasChangesSinceLastSave(state, resourceKey),
  )
  const { handleCloseResource } = useEditor(resourceKey)
  const label = subject?.label || "Untitled"

  const handleRemove = () => {
    if (hasChanged) {
      dispatch(showModal(`CloseResourceModal-${resourceKey}`))
    } else {
      handleCloseResource()
    }
  }

  return (
    <React.Fragment>
      <CloseResourceModal resourceKey={resourceKey} />
      <Chip
        kind={kindForSubjectTemplate(subjectTemplate)}
        label={label}
        onOpen={() => dispatch(setCurrentResource(resourceKey))}
        onRemove={handleRemove}
        removeLabel={`Close ${label}`}
      />
    </React.Fragment>
  )
}

OpenChip.propTypes = {
  resourceKey: PropTypes.string.isRequired,
}

const RecentlyOpened = () => {
  const historicalResources = useSelector((state) =>
    selectHistoricalResources(state),
  )
  const historicalTemplates = useSelector((state) =>
    selectHistoricalTemplates(state),
  )
  const resourceKeys = useSelector((state) => selectResourceKeys(state))
  const currentResourceKey = useSelector((state) =>
    selectCurrentResourceKey(state),
  )
  // The other open resources that only this row can reach; the current one is
  // already on screen. Joined so the selector returns a value that compares
  // equal between renders.
  const openKeys = useSelector((state) =>
    resourceKeys
      .filter(
        (key) =>
          key !== currentResourceKey &&
          !kindForUri(selectNormSubject(state, key)?.uri),
      )
      .join(" "),
  )

  const open = openKeys ? openKeys.split(" ") : []
  const resources = historicalResources
    .map((resource) => ({ resource, kind: kindForUri(resource.uri) }))
    .filter(({ kind }) => kind)

  const listRef = useRef(null)
  const [scroll, setScroll] = useState({ left: false, right: false })

  const updateScroll = useCallback(() => {
    const list = listRef.current
    if (!list) return
    setScroll({
      left: list.scrollLeft > 0,
      right: list.scrollLeft + list.clientWidth < list.scrollWidth - 1,
    })
  }, [])

  const itemCount = open.length + resources.length + historicalTemplates.length

  useEffect(() => {
    updateScroll()
    window.addEventListener("resize", updateScroll)
    return () => window.removeEventListener("resize", updateScroll)
  }, [updateScroll, itemCount])

  if (itemCount === 0) return null

  const hasOverflow = scroll.left || scroll.right
  const scrollBy = (direction) => {
    const list = listRef.current
    list.scrollBy({
      left: direction * list.clientWidth * 0.8,
      behavior: "smooth",
    })
  }

  return (
    <section
      className="recently-opened"
      aria-labelledby="recently-opened-heading"
    >
      <h2 id="recently-opened-heading" className="recently-opened-heading">
        Recently opened:
      </h2>
      <div className="recently-opened-row">
        {hasOverflow && (
          <button
            type="button"
            className="recently-opened-scroll"
            aria-label="Scroll recently opened left"
            disabled={!scroll.left}
            onClick={() => scrollBy(-1)}
          >
            <ArrowIcon />
          </button>
        )}
        <ul
          className="recently-opened-list"
          ref={listRef}
          onScroll={updateScroll}
        >
          {open.map((resourceKey) => (
            <OpenChip key={resourceKey} resourceKey={resourceKey} />
          ))}
          {resources.map(({ resource, kind }) => (
            <ResourceChip key={resource.uri} resource={resource} kind={kind} />
          ))}
          {historicalTemplates.map((template) => (
            <TemplateChip key={template.id} template={template} />
          ))}
        </ul>
        {hasOverflow && (
          <button
            type="button"
            className="recently-opened-scroll recently-opened-scroll-right"
            aria-label="Scroll recently opened right"
            disabled={!scroll.right}
            onClick={() => scrollBy(1)}
          >
            <ArrowIcon />
          </button>
        )}
      </div>
    </section>
  )
}

export default RecentlyOpened
