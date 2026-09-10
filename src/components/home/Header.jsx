// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import { Link } from "react-router-dom"
import Config from "Config"
import { signOut } from "actionCreators/authenticate"
import { useKeycloak } from "../../KeycloakContext"
import useAuthenticateStore from "stores/authenticateStore"

const bcLogo = require("../../styles/bluecore-small.png")

const Header = (props) => {
  const { keycloak } = useKeycloak()
  const currentUser = useAuthenticateStore((state) => state.user)

  return (
    <div className="navbar homepage-navbar">
      <div className="navbar-header">
        <a className="navbar-brand" href={`${Config.sinopiaUrl}`}>
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
      <ul className="nav">
        {currentUser && (
          <React.Fragment>
            <li className="nav-item">
              <span className="nav-link editor-header-user">
                {currentUser.username}
              </span>
            </li>
            <div className="nav-link">•</div>
            <li className="nav-item">
              <Link to="/dashboard" className="nav-link">
                Linked Data Editor
              </Link>
            </li>
          </React.Fragment>
        )}
        {currentUser && <div className="nav-link">•</div>}
        <li className="menu nav-item">
          <a
            href="#"
            className="help-resources nav-link"
            onClick={props.triggerHomePageMenu}
          >
            Help
          </a>
        </li>
        {currentUser && <div className="nav-link">•</div>}
        {currentUser && (
          <li className="nav-item">
            <a
              href="#"
              className="nav-link editor-header-logout"
              onClick={() => signOut(keycloak)}
            >
              Logout
            </a>
          </li>
        )}
      </ul>
    </div>
  )
}

Header.propTypes = {
  triggerHomePageMenu: PropTypes.func,
}

export default Header
