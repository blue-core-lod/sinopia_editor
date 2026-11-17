// Copyright 2019 Stanford University see LICENSE for license

import React, { useEffect, useRef } from "react"
import PropTypes from "prop-types"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCaretDown } from "@fortawesome/free-solid-svg-icons"
import { NavLink, useLocation } from "react-router-dom"
import Config from "Config"
import { connect } from "react-redux"
import { selectUser } from "selectors/authenticate"
import { signOut } from "actionCreators/authenticate"
import { bindActionCreators } from "redux"
import { selectCurrentResourceKey } from "selectors/resources"
import { useKeycloak } from "../KeycloakContext"
import usePermissions from "hooks/usePermissions"
import HeaderSearch from "./search/HeaderSearch"
import SessionStatus from "./SessionStatus"

const Header = (props) => {
  const { canCreate } = usePermissions()
  const location = useLocation()
  const isActionsActive =
    location.pathname === "/exports" ||
    location.pathname === "/load" ||
    location.pathname.startsWith("/metrics/")

  const { keycloak } = useKeycloak()
  const { signOut } = props

  // <bluecore-header> fires `bluecore-logout` (bubbles) when its Logout button
  // is clicked; listening on the element works before and after it upgrades.
  const bluecoreHeaderRef = useRef(null)
  useEffect(() => {
    const el = bluecoreHeaderRef.current
    if (!el) return undefined
    const onLogout = () => signOut(keycloak)
    el.addEventListener("bluecore-logout", onLogout)
    return () => el.removeEventListener("bluecore-logout", onLogout)
  }, [signOut, keycloak])

  return (
    <React.Fragment>
      {/* The shared Blue Core header, defined by bluecore-stack's
          /assets/bluecore/bluecore-header-footer.js (loaded in index.html). */}
      <bluecore-header
        ref={bluecoreHeaderRef}
        data-testid="bluecore-header"
        app-name={`SINOPIA${Config.sinopiaEnv}`}
        current-app="sinopia"
        logout={props.currentUser ? "" : undefined}
      ></bluecore-header>
      {props.currentUser && <SessionStatus />}
      <nav className="navbar navbar-expand-lg editor-navtabs">
        <ul className="navbar-nav">
          {/* Navlinks enable highlighting the appropriate tab based on route, active style is defined in css */}
          <li className="nav-item">
            <NavLink className="nav-link" to="/dashboard">
              Dashboard
            </NavLink>
          </li>
          {props.hasResource && canCreate && (
            <li className="nav-item">
              <NavLink className="nav-link" to="/editor">
                Editor
              </NavLink>
            </li>
          )}
          <li className="nav-item">
            <NavLink className="nav-link" to="/templates">
              Resource templates
            </NavLink>
          </li>
          <li className="nav-item dropdown">
            <a
              className={`nav-link dropdown-toggle ${
                isActionsActive && "active"
              }`}
              data-bs-toggle="dropdown"
              href="#"
              role="button"
              aria-expanded="false"
            >
              Actions
            </a>
            <ul className="dropdown-menu">
              {canCreate && (
                <li>
                  <NavLink className="dropdown-item" to="/load">
                    Load RDF
                  </NavLink>
                </li>
              )}
              <li>
                <NavLink className="dropdown-item" to="/exports">
                  Exports
                </NavLink>
              </li>
              <li>
                <h6 className="dropdown-header">View metrics</h6>
              </li>
              <li>
                <NavLink className="dropdown-item" to="/metrics/resources">
                  Resources
                </NavLink>
              </li>
              <li>
                <NavLink className="dropdown-item" to="/metrics/templates">
                  Templates
                </NavLink>
              </li>
              <li>
                <NavLink className="dropdown-item" to="/metrics/users">
                  Users
                </NavLink>
              </li>
            </ul>
          </li>
        </ul>
        <HeaderSearch />
        {props.currentUser && (
          <button
            type="button"
            className="sinopia-help-button"
            onClick={props.triggerEditorMenu}
          >
            Help <FontAwesomeIcon icon={faCaretDown} />
          </button>
        )}
      </nav>
    </React.Fragment>
  )
}

Header.propTypes = {
  triggerEditorMenu: PropTypes.func,
  hasResource: PropTypes.bool,
  currentUser: PropTypes.object,
  signOut: PropTypes.func,
}

const mapStateToProps = (state) => ({
  currentUser: selectUser(state),
  hasResource: !!selectCurrentResourceKey(state),
})

const mapDispatchToProps = (dispatch) =>
  bindActionCreators({ signOut }, dispatch)

export default connect(mapStateToProps, mapDispatchToProps)(Header)
