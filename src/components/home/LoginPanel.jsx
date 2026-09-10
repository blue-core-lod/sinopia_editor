import React, { useState } from "react"
import { useDispatch } from "react-redux"
import useAuthenticateStore from "stores/authenticateStore"
import { signIn } from "actionCreators/authenticate"
import { useKeycloak } from "../../KeycloakContext"
import useEditorStore from "stores/editorStore"
import _ from "lodash"
import { signInErrorKey } from "utilities/errorKeyFactory"

const LoginPanel = () => {
  const dispatch = useDispatch()
  const hasUser = useAuthenticateStore((state) => !!state.user)

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const { keycloak } = useKeycloak()

  const error = _.first(
    useEditorStore((state) => state.errors[signInErrorKey])
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    const resourceParam = new URLSearchParams(window.location.search).get(
      "resource"
    )
    const redirectUri = resourceParam ? window.location.href : undefined
    dispatch(signIn(keycloak, signInErrorKey, redirectUri))
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
