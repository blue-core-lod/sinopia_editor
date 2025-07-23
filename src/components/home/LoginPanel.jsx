import React, { useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { hasUser as hasUserSelector } from "selectors/authenticate"
import { signIn } from "actionCreators/authenticate"
import { useKeycloak } from "../../KeycloakContext"
import Config from "Config"
import { selectErrors } from "selectors/errors"
import _ from "lodash"
import { signInErrorKey } from "utilities/errorKeyFactory"

const LoginPanel = () => {
  const dispatch = useDispatch()
  const hasUser = useSelector((state) => hasUserSelector(state))

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const { keycloak } = useKeycloak()

  const error = _.first(
    useSelector((state) => selectErrors(state, signInErrorKey))
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    dispatch(signIn(keycloak, signInErrorKey))
  }

  if (hasUser) return null

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
