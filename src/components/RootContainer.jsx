// Copyright 2019 Stanford University see LICENSE for license

import React, { useState } from "react"
import { hot } from "react-hot-loader"
import { OffCanvas, OffCanvasBody, OffCanvasMenu } from "react-offcanvas"
import { BrowserRouter } from "react-router-dom"
import { Provider } from "react-redux"
import CanvasMenu from "./menu/CanvasMenu"
import App from "./App"
import store from "../store"
import { KeycloakProvider } from "../KeycloakContext"
import HoneybadgerNotifier from "Honeybadger"
import { HoneybadgerErrorBoundary } from "@honeybadger-io/react"

const RootContainer = () => {
  const [isMenuOpened, setMenuOpened] = useState(false)

  const offcanvasClass = isMenuOpened ? "closeMargin" : null

  return (
    <HoneybadgerErrorBoundary honeybadger={HoneybadgerNotifier}>
      <KeycloakProvider>
        <div id="home-page">
          <OffCanvas
            width={300}
            transitionDuration={300}
            isMenuOpened={isMenuOpened}
            position={"right"}
            effect={"overlay"}
          >
            <OffCanvasBody className={offcanvasClass}>
              <BrowserRouter>
                <Provider store={store}>
                  <App
                    isMenuOpened={isMenuOpened}
                    handleOffsetMenu={() => setMenuOpened(!isMenuOpened)}
                  />
                </Provider>
              </BrowserRouter>
            </OffCanvasBody>
            <OffCanvasMenu className="offcanvas-menu">
              <CanvasMenu closeHandleMenu={() => setMenuOpened(false)} />
            </OffCanvasMenu>
          </OffCanvas>
        </div>
      </KeycloakProvider>
    </HoneybadgerErrorBoundary>
  )
}

export default hot(module)(RootContainer)
