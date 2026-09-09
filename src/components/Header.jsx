// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import { NavLink, useLocation } from "react-router-dom"
import Config from "Config"
import { useSelector, useDispatch } from "react-redux"
import { signOut } from "actionCreators/authenticate"
import { selectCurrentResourceKey } from "selectors/resources"
import { useKeycloak } from "../KeycloakContext"
import usePermissions from "hooks/usePermissions"
import useAuthenticateStore from "stores/authenticateStore"
import HeaderSearch from "./search/HeaderSearch"

const bcLogo = require("../styles/bluecore-small.png")

const Header = (props) => {
  const { canCreate } = usePermissions()
  const location = useLocation()
  const dispatch = useDispatch()
  const isActionsActive =
    location.pathname === "/exports" ||
    location.pathname === "/load" ||
    location.pathname.startsWith("/metrics/")

  const { keycloak } = useKeycloak()
  const currentUser = useAuthenticateStore((state) => state.user)
  const hasResource = useSelector((state) => !!selectCurrentResourceKey(state))

  return (
    <React.Fragment>
      <div className="editor-navbar">
        <div className="row">
          <div className="col-6">
            <a href="/">
              <h1 className="editor-logo">
                <img
                  src={bcLogo}
                  alt="Blue Core Logo"
                  style={{ paddingBottom: "8px" }}
                ></img>{" "}
                | Sinopia{`${Config.sinopiaEnv}`}
              </h1>
            </a>
          </div>
          <div className="col-6">
            <ul className="nav pull-right">
              {currentUser && (
                <li className="nav-item">
                  <span className="nav-link editor-header-user">
                    {currentUser.username}
                  </span>
                </li>
              )}
              <div className="nav-link">•</div>
              {currentUser && (
                <li className="nav-item">
                  <a
                    href="#"
                    className="nav-link editor-help-resources"
                    onClick={props.triggerEditorMenu}
                  >
                    Help
                  </a>
                </li>
              )}
              <div className="nav-link">•</div>
              {currentUser && (
                <li className="nav-item">
                  <a
                    href="#"
                    className="nav-link editor-header-logout"
                    onClick={() => dispatch(signOut(keycloak))}
                  >
                    Logout
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
      <nav className="navbar navbar-expand-lg editor-navtabs">
        <ul className="navbar-nav">
          <li className="nav-item">
            <NavLink className="nav-link" to="/dashboard">
              Dashboard
            </NavLink>
          </li>
          {hasResource && canCreate && (
            <li className="nav-item">
              <NavLink className="nav-link" to="/editor">
                Editor
              </NavLink>
            </li>
          )}
          <li className="nav-item">
            <NavLink className="nav-link" to="/templates">
              Resource Templates
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
      </nav>
    </React.Fragment>
  )
}

Header.propTypes = {
  triggerEditorMenu: PropTypes.func,
}

export default Header
