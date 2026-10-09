// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCircleArrowRight, faTimes } from "@fortawesome/free-solid-svg-icons"
import PropTypes from "prop-types"
import helpMenuSections from "./helpMenuLinks"

const CanvasMenu = (props) => (
  <div>
    <button
      type="button"
      aria-label="Close Help Menu"
      className="btn pull-right"
      onClick={props.closeHandleMenu}
    >
      <FontAwesomeIcon className="close-icon" icon={faTimes} />
    </button>

    <ul className="help-menu">
      {helpMenuSections.map(({ heading, links }) => (
        <React.Fragment key={heading}>
          <li className="help-menu-heading">
            <FontAwesomeIcon icon={faCircleArrowRight} aria-hidden="true" />{" "}
            <strong>{heading}</strong>
          </li>
          {links.map(({ label, href }) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noopener noreferrer">
                {label}
              </a>
            </li>
          ))}
        </React.Fragment>
      ))}
    </ul>
  </div>
)

CanvasMenu.propTypes = {
  closeHandleMenu: PropTypes.func,
}

export default CanvasMenu
