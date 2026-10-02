// Copyright 2019 Stanford University see LICENSE for license

import React, { useState } from "react"
import { BrowserRouter } from "react-router-dom"
import { Provider } from "react-redux"
import CanvasMenu from "./menu/CanvasMenu"
import App from "./App"
import store from "../store"
import { KeycloakProvider } from "../KeycloakContext"
import HoneybadgerNotifier from "Honeybadger"
import { HoneybadgerErrorBoundary } from "@honeybadger-io/react"

/*
 * Replaces react-offcanvas, which declared `react: ^0.14.7` as a hard
 * dependency and so pulled a second React (0.14.10, ~591 KiB) into the bundle
 * alongside the real one. Its three components were ~200 lines of inline-style
 * math; these are the styles it computed for the only props this app ever
 * passed (width 300, transitionDuration 300, position "right", effect
 * "overlay"). Note that under effect="overlay" the body translate is 0 in both
 * the open and closed state, so the body never moved — only .closeMargin did
 * anything, and that is kept below.
 */
const MENU_WIDTH = 300
const TRANSITION_MS = 300

const menuStyle = (isMenuOpened) => ({
  width: `${MENU_WIDTH}px`,
  position: "fixed",
  top: "0px",
  left: "auto",
  right: `${-1 * MENU_WIDTH}px`,
  transform: `translate(${isMenuOpened ? -1 * MENU_WIDTH : 0}px, 0px)`,
  transitionDuration: `${TRANSITION_MS}ms`,
  backfaceVisibility: "hidden",
})

const RootContainer = () => {
  const [isMenuOpened, setMenuOpened] = useState(false)

  const offcanvasClass = isMenuOpened ? "closeMargin" : null

  return (
    <HoneybadgerErrorBoundary honeybadger={HoneybadgerNotifier}>
      <KeycloakProvider>
        <div id="home-page">
          <div>
            <div
              className={offcanvasClass}
              style={{
                transitionDuration: `${TRANSITION_MS}ms`,
                transform: "translate(0px, 0px)",
                backfaceVisibility: "hidden",
              }}
            >
              <BrowserRouter basename="/sinopia">
                <Provider store={store}>
                  <App
                    isMenuOpened={isMenuOpened}
                    handleOffsetMenu={() => setMenuOpened(!isMenuOpened)}
                  />
                </Provider>
              </BrowserRouter>
            </div>
            <div className="offcanvas-menu" style={menuStyle(isMenuOpened)}>
              <CanvasMenu closeHandleMenu={() => setMenuOpened(false)} />
            </div>
          </div>
        </div>
      </KeycloakProvider>
    </HoneybadgerErrorBoundary>
  )
}

export default RootContainer
