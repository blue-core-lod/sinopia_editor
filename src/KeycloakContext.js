// KeycloakContext.js
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import PropTypes from "prop-types"
import Keycloak from "keycloak-js"
import Config from "Config"

const KeycloakContext = createContext()

// Things the user does that count as activity.
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
]

const ACTIVE_REFRESH_MS = 60000 // 60 seconds - how often activity renews the session
const MIN_REFRESH_MS = 15000 // 15 seconds - fastest renewal when the warning is near
export const SESSION_WARNING_MS = 300000 // 5 minute warning for user to continue
const SESSION_CHANNEL = "sinopia-session"

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
  // When the session ends (as a timestamp in milliseconds), and whether it has ended.
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const lastActivityAt = useRef(0)
  const lastRefreshAt = useRef(0)
  const sessionExpiresAtRef = useRef(null)
  const channelRef = useRef(null)

  // Gets a new token, which also extends the session.
  const refresh = useCallback(
    (minValidity) => keycloak.updateToken(minValidity).catch(() => {}),
    [keycloak]
  )

  // Returns when the session ends, based on this tab's token.
  const tokenExpiresAt = useCallback(() => {
    const exp = keycloak.refreshTokenParsed?.exp
    return exp ? (exp + (keycloak.timeSkew || 0)) * 1000 : null
  }, [keycloak])

  // Saves the session end time for the warning dialog.
  const updateSessionEnd = useCallback((expiresAt) => {
    sessionExpiresAtRef.current = expiresAt
    setSessionExpiresAt(expiresAt)
  }, [])

  useEffect(() => {
    // Lets open Sinopia tabs share the session end time, so working in one
    // tab keeps the others from showing the warning.
    if (typeof BroadcastChannel === "undefined") return undefined
    const channel = new BroadcastChannel(SESSION_CHANNEL)
    // Runs when another tab extends the session.
    channel.onmessage = ({ data }) => {
      const expiresAt = data?.sessionExpiresAt
      if (!keycloak.refreshToken) return
      if (!expiresAt || expiresAt <= sessionExpiresAtRef.current) return
      updateSessionEnd(expiresAt)
      // Renew this tab's token before it expires, or Keycloak rejects it.
      if (
        tokenExpiresAt() - Date.now() <=
        SESSION_WARNING_MS + ACTIVE_REFRESH_MS
      )
        refresh(-1)
    }
    channelRef.current = channel
    return () => {
      channelRef.current = null
      channel.close()
    }
  }, [keycloak, refresh, tokenExpiresAt, updateSessionEnd])

  useEffect(() => {
    if (keycloak.initialized) return

    // After each renewal, save the new end time and tell other tabs.
    const trackSession = () => {
      lastRefreshAt.current = Date.now()
      updateSessionEnd(tokenExpiresAt())
      if (sessionExpiresAtRef.current)
        channelRef.current?.postMessage({
          sessionExpiresAt: sessionExpiresAtRef.current,
        })
    }
    keycloak.onAuthRefreshSuccess = trackSession
    // Runs when Keycloak says the session has ended.
    keycloak.onAuthLogout = () => setSessionExpired(true)
    // When the token runs out, renew it only if the user has been active.
    // Once the warning shows, only Continue extends the session.
    keycloak.onTokenExpired = () => {
      if (sessionExpiresAtRef.current - Date.now() <= SESSION_WARNING_MS) return
      if (lastActivityAt.current > lastRefreshAt.current) refresh(30)
    }

    keycloak
      .init({
        // Sign in automatically if already signed in elsewhere (like Marva).
        onLoad: "check-sso",
        silentCheckSsoRedirectUri: `${Config.sinopiaUrl.replace(
          /\/$/,
          ""
        )}/dist/silent-check-sso.html`,
        // Notice quickly when the user logs out in another tab or app.
        checkLoginIframe: true,
      })
      .then((authenticated) => {
        setAuthenticated(authenticated)
        setInitialized(true)
        trackSession()
      })
      .catch((err) => {
        console.error("Keycloak initialization failed:", err)
        setInitialized(true)
      })
  }, [keycloak, refresh, tokenExpiresAt, updateSessionEnd])

  useEffect(() => {
    // Keeps the session going while the user is active. Once the warning
    // shows, only Continue extends the session.
    const onActivity = () => {
      const now = Date.now()
      lastActivityAt.current = now
      if (!keycloak.refreshToken) return
      const msUntilWarning =
        sessionExpiresAtRef.current - now - SESSION_WARNING_MS
      if (msUntilWarning <= 0) return
      const msSinceRefresh = now - lastRefreshAt.current
      if (
        keycloak.isTokenExpired(30) ||
        msSinceRefresh > ACTIVE_REFRESH_MS ||
        (msUntilWarning < ACTIVE_REFRESH_MS && msSinceRefresh > MIN_REFRESH_MS)
      )
        refresh(-1)
    }
    // "capture" makes clicks inside dropdowns and dialogs count too.
    ACTIVITY_EVENTS.forEach((name) =>
      window.addEventListener(name, onActivity, {
        capture: true,
        passive: true,
      })
    )
    return () =>
      ACTIVITY_EVENTS.forEach((name) =>
        window.removeEventListener(name, onActivity, { capture: true })
      )
  }, [keycloak, refresh])

  // Extends the session (used by the Continue button).
  const extendSession = useCallback(() => refresh(-1), [refresh])

  return (
    <KeycloakContext.Provider
      value={{
        keycloak,
        authenticated,
        initialized,
        sessionExpiresAt,
        sessionExpired,
        extendSession,
      }}
    >
      {children}
    </KeycloakContext.Provider>
  )
}

KeycloakProvider.propTypes = {
  children: PropTypes.node,
}
