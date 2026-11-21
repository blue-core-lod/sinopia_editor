// Copyright 2019 Stanford University see LICENSE for license

import React, { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import PanelResource from "./property/PanelResource"
import CopyToNewMessage from "./CopyToNewMessage"
import ResourceURIMessage from "./ResourceURIMessage"
import TemplateUsageMessage from "./TemplateUsageMessage"
import TemplateVersionMessage from "./TemplateVersionMessage"
import ResourceHeading from "./ResourceHeading"
import WorkViewToggle from "./WorkViewToggle"
import UnusedRDFToggle from "./UnusedRDFToggle"
import SaveAlert from "./SaveAlert"
import {
  selectCurrentResourceKey,
  selectNormSubject,
} from "selectors/resources"
import UnusedRDFDisplay from "./UnusedRDFDisplay"
import { isInViewport } from "utilities/Utilities"
import CloseButton from "./actions/CloseButton"
import SaveAndPublishButton from "./actions/SaveAndPublishButton"
import TopButton from "./actions/TopButton"

/**
 * This is the root component of the editor on the resource edit page
 */
const ResourceComponent = () => {
  const resourceKey = useSelector((state) => selectCurrentResourceKey(state))
  const resource = useSelector((state) => selectNormSubject(state, resourceKey))
  const [isHeaderInViewport, setHeaderInViewport] = useState(true)
  const [isUnusedRDFOpen, setUnusedRDFOpen] = useState(false)

  // Each resource opens with its unused triples collapsed
  useEffect(() => setUnusedRDFOpen(false), [resourceKey])

  useEffect(() => {
    const onScroll = () => {
      const currentlyInViewport = isInViewport(
        document.querySelector("#sticky-beacon"),
      )
      if (isHeaderInViewport !== currentlyInViewport) {
        setHeaderInViewport(currentlyInViewport)
      }
    }
    window.addEventListener("scroll", onScroll)

    return () => window.removeEventListener("scroll", onScroll)
  }, [isHeaderInViewport])

  if (!resource) {
    return null
  }

  const stickyClasses = ["sticky-resource-header"]
  if (isHeaderInViewport) stickyClasses.push("d-none")

  return (
    <div id="resourceTemplate">
      <section className="resource-header">
        <div className="resource-heading-row">
          <ResourceHeading resource={resource} id="resource-header" />
          <WorkViewToggle resourceKey={resourceKey} />
          <div className="resource-heading-links">
            <UnusedRDFToggle
              isOpen={isUnusedRDFOpen}
              onToggle={() => setUnusedRDFOpen(!isUnusedRDFOpen)}
            />
            <ResourceURIMessage resourceKey={resourceKey} />
          </div>
        </div>
        <CopyToNewMessage />
        <TemplateUsageMessage resourceKey={resourceKey} />
        <TemplateVersionMessage resourceKey={resourceKey} />
        <SaveAlert />
      </section>
      <div id="sticky-beacon" />
      <section className={stickyClasses.join(" ")} id="sticky-resource-header">
        <div className="row">
          <div className="col-md-9">
            <ResourceHeading resource={resource} />
          </div>
          <div className="col-md-1">
            <TopButton />
          </div>
          <div className="col-md-2">
            <div className="d-flex justify-content-end">
              <CloseButton css={"editor-action-close"} label={"Cancel"} />
              <SaveAndPublishButton class="editor-save" />
            </div>
          </div>
        </div>
        <CopyToNewMessage />
        <div className="row">
          <div className="col">
            <ResourceURIMessage resourceKey={resourceKey} />
          </div>
        </div>
      </section>
      <UnusedRDFDisplay isOpen={isUnusedRDFOpen} />
      <PanelResource resource={resource} />
    </div>
  )
}

export default ResourceComponent
