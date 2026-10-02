import React from "react"
import { useSelector, useDispatch } from "react-redux"
import { hasUser as hasUserSelector } from "selectors/authenticate"
import { signIn } from "actionCreators/authenticate"
import { useKeycloak } from "../../KeycloakContext"
import { selectErrors } from "selectors/errors"
import _ from "lodash"
import { signInErrorKey } from "utilities/errorKeyFactory"

const LoginPanel = () => {
  const dispatch = useDispatch()
  const hasUser = useSelector((state) => hasUserSelector(state))

  const { keycloak, initialized, authenticated } = useKeycloak()

  const error = _.first(
    useSelector((state) => selectErrors(state, signInErrorKey))
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    const resourceParam = new URLSearchParams(window.location.search).get(
      "resource"
    )
    const redirectUri = resourceParam ? window.location.href : undefined
    dispatch(signIn(keycloak, signInErrorKey, redirectUri))
  }

  // Hide until Keycloak has checked for an existing session and any signed-in
  // user has been loaded, so the login button doesn't flash for them.
  if (hasUser || !initialized || authenticated) return null

  return (
    <React.Fragment>
      {error && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          {error}
        </div>
      )}
      <form className="login-form" onSubmit={(event) => handleSubmit(event)}>
        <h4>Login to the Linked Data Editor</h4>
        <div className="row">
          <div className="col-sm-6">
            <button className="btn btn-block btn-primary" type="submit">
              Login
            </button>
          </div>
        </div>
      </form>
    </React.Fragment>
  )
}

export default LoginPanel
