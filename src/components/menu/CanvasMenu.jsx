// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCircleArrowRight, faTimes } from "@fortawesome/free-solid-svg-icons"
import PropTypes from "prop-types"
import helpMenuSections from "./helpMenuLinks"
import applicationMenuSections from "./applicationLinks"

// Help links are external resources, so they open in a new tab; switching
// applications replaces this one.
const menus = {
  help: { label: "Help", sections: helpMenuSections, newTab: true },
  applications: {
    label: "Applications",
    sections: applicationMenuSections,
    newTab: false,
  },
}

const CanvasMenu = ({ menu = "help", closeHandleMenu }) => {
  const { label, sections, newTab } = menus[menu]
  const linkProps = newTab
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {}

  return (
    <div>
      <button
        type="button"
        aria-label={`Close ${label} Menu`}
        className="btn pull-right"
        onClick={closeHandleMenu}
      >
        <FontAwesomeIcon className="close-icon" icon={faTimes} />
      </button>

      <ul className="help-menu">
        {sections.map(({ heading, links }) => (
          <React.Fragment key={heading}>
            <li className="help-menu-heading">
              <FontAwesomeIcon icon={faCircleArrowRight} aria-hidden="true" />{" "}
              <strong>{heading}</strong>
            </li>
            {links.map(({ label: linkLabel, href }) => (
              <li key={href}>
                <a href={href} {...linkProps}>
                  {linkLabel}
                </a>
              </li>
            ))}
          </React.Fragment>
        ))}
      </ul>
    </div>
  )
}

CanvasMenu.propTypes = {
  menu: PropTypes.oneOf(Object.keys(menus)),
  closeHandleMenu: PropTypes.func,
}

export default CanvasMenu
