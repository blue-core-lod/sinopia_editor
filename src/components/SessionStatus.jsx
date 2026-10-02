import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import PropTypes from "prop-types"
import { DialogOverlay, DialogContent } from "@reach/dialog"
import "@reach/dialog/styles.css"
import { useKeycloak, SESSION_WARNING_MS as WARN_MS } from "../KeycloakContext"

const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, "0")
  return `${minutes}:${seconds}`
}

const SessionDialog = ({ title, children, footer, onDismiss }) => (
  <DialogOverlay className="modal-wrapper" onDismiss={onDismiss}>
    <DialogContent aria-label={title}>
      <div className="card">
        <div className="card-header">
          <h4 className="card-title">{title}</h4>
        </div>
        <div className="card-body">{children}</div>
        <div className="card-footer">{footer}</div>
      </div>
    </DialogContent>
  </DialogOverlay>
)

SessionDialog.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  footer: PropTypes.node,
  onDismiss: PropTypes.func,
}

// Warns when the sign-in session is about to end, letting the user extend it,
// and prompts them to log back in once it has ended.
const SessionStatus = () => {
  const { keycloak, sessionExpiresAt, sessionExpired, extendSession } =
    useKeycloak()
  const [now, setNow] = useState(Date.now())
  const [dismissed, setDismissed] = useState(false)
  const [extending, setExtending] = useState(false)
  const [cannotExtend, setCannotExtend] = useState(false)
  const [warningClosed, setWarningClosed] = useState(false)

  const msLeft = sessionExpiresAt ? sessionExpiresAt - now : 0
  const expired = sessionExpired || (!!sessionExpiresAt && msLeft <= 0)
  const warning = !!sessionExpiresAt && !expired && msLeft <= WARN_MS

  useEffect(() => {
    if (!sessionExpiresAt) return undefined
    // Tick every second during the countdown, otherwise every 30 seconds.
    const timer = setInterval(() => setNow(Date.now()), warning ? 1000 : 30000)
    return () => clearInterval(timer)
  }, [sessionExpiresAt, warning])

  // Resets the warning once the session is no longer about to end.
  useEffect(() => {
    if (warning) return
    setCannotExtend(false)
    setWarningClosed(false)
  }, [warning])

  const logBackIn = () => keycloak.login({ redirectUri: window.location.href })

  // Extends the session. If the end time doesn't move, the session has hit
  // its maximum length and can't be extended.
  const continueSession = () => {
    const previousExpiresAt = sessionExpiresAt
    setExtending(true)
    extendSession().then(() => {
      setExtending(false)
      const exp = keycloak.refreshTokenParsed?.exp
      const newExpiresAt = exp && (exp + (keycloak.timeSkew || 0)) * 1000
      if (newExpiresAt && newExpiresAt - previousExpiresAt < 5000)
        setCannotExtend(true)
    })
  }

  // Closes the warning so the user can save before the session ends.
  const closeWarning = () => setWarningClosed(true)

  if (warning && warningClosed) return null

  if (warning) {
    return (
      <SessionDialog
        title="Your session is about to end"
        onDismiss={cannotExtend ? closeWarning : undefined}
        footer={
          cannotExtend ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={closeWarning}
            >
              Close
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={continueSession}
              disabled={extending}
            >
              Continue
            </button>
          )
        }
      >
        <p>
          Your session will end in <strong>{formatCountdown(msLeft)}</strong>.
          Click <em>Continue</em> to keep working.
        </p>
        {cannotExtend && (
          <div className="alert alert-warning" role="alert">
            This session can&apos;t be extended any further. Save your work,
            then log back in when it ends.
          </div>
        )}
      </SessionDialog>
    )
  }

  if (!expired) return null

  return (
    <React.Fragment>
      {/* Stays at the top of every page so it's always clear the user is
          logged out, even after closing the dialog. */}
      {createPortal(
        <div
          className="alert alert-danger text-center m-0 rounded-0"
          role="alert"
          style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1050 }}
        >
          You are logged out. Changes can&apos;t be saved until you log back in.{" "}
          <button
            type="button"
            className="btn btn-danger btn-sm ms-2"
            onClick={logBackIn}
          >
            Log back in
          </button>
        </div>,
        document.body
      )}
      {!dismissed && (
        <SessionDialog
          title="You have been logged out"
          onDismiss={() => setDismissed(true)}
          footer={
            <React.Fragment>
              <button
                type="button"
                className="btn btn-link btn-sm"
                onClick={() => setDismissed(true)}
              >
                Not now
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={logBackIn}
              >
                Log back in
              </button>
            </React.Fragment>
          }
        >
          <p>Log back in to keep saving your work.</p>
          <p>
            Logging in reloads this page, so unsaved changes will be lost. To
            keep them, choose <em>Not now</em> and copy them first.
          </p>
        </SessionDialog>
      )}
    </React.Fragment>
  )
}

export default SessionStatus
