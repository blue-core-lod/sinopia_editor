// KeycloakContext.js
import React, { createContext, useContext, useEffect, useState } from "react"
import Keycloak from "keycloak-js"
import Config from "Config"

const KeycloakContext = createContext()

export const useKeycloak = () => {
  const context = useContext(KeycloakContext)
  if (!context) {
    throw new Error("useKeycloak must be used within KeycloakProvider")
  }
  return context
}

export const KeycloakProvider = ({ children }) => {
  const [keycloak] = useState(
    () =>
      new Keycloak({
        url: Config.keycloakUrl,
        realm: Config.keycloakRealm,
        clientId: Config.keycloakClientId,
      })
  )

  const [authenticated, setAuthenticated] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (keycloak.initialized) return
    keycloak.init().then((authenticated) => {
      setAuthenticated(authenticated)
      setInitialized(true)
    })
  }, [keycloak])

  return (
    <KeycloakContext.Provider value={{ keycloak, authenticated, initialized }}>
      {children}
    </KeycloakContext.Provider>
  )
}
