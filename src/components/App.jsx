// Copyright 2019 Stanford University see LICENSE for license

import React, { useEffect, useLayoutEffect, useState } from "react"
import { Helmet, HelmetProvider } from "react-helmet-async"
import Config from "Config"
import "react-bootstrap-typeahead/css/Typeahead.css"
import PropTypes from "prop-types"
import HomePage from "./home/HomePage"
import "../styles/main.scss"
import Editor from "./editor/Editor"
import Footer from "./Footer"
import Dashboard from "./dashboard/Dashboard"
import {
  Route,
  Routes,
  useNavigate,
  useLocation,
  useMatch,
} from "react-router-dom"
import ResourceTemplate from "./templates/ResourceTemplate"
import LoadResource from "./load/LoadResource"
import Search from "./search/Search"
import CanvasMenu from "./menu/CanvasMenu"
import Vocab from "./vocabulary/Vocab"
import { useDispatch, useSelector } from "react-redux"
import { fetchGroups } from "actionCreators/groups"
import { fetchLanguages } from "actionCreators/languages"
import { fetchExports } from "actionCreators/exports"
import Exports from "./exports/Exports"
import { authenticate } from "actionCreators/authenticate"
import { hasUser as hasUserSelector } from "selectors/authenticate"
import { isModalOpen as isModalOpenSelector } from "selectors/modals"
import {
  newResource as newResourceCreator,
  loadResource,
  dispatchResourceForPreview,
  dispatchResourceForEditor,
} from "actionCreators/resources"
import { useKeycloak } from "../KeycloakContext"
import usePermissions from "hooks/usePermissions"
import { showModal } from "actions/modals"
import {
  dashboardErrorKey,
  templateErrorKey,
  exportsErrorKey,
} from "utilities/errorKeyFactory"
import { uriFromResourceId } from "utilities/Utilities"
import TemplateMetrics from "./metrics/TemplateMetrics"
import ResourceMetrics from "./metrics/ResourceMetrics"
import UserMetrics from "./metrics/UserMetrics"

const FourOhFour = () => <h1>404</h1>

const App = (props) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { canCreate, canEdit } = usePermissions()
  const [isFirstMountWithUser, setFirstMountWithUser] = useState(true)
  const { keycloak } = useKeycloak()
  const hasUser = useSelector((state) => hasUserSelector(state))
  const isModalOpen = useSelector((state) => isModalOpenSelector(state))

  useEffect(() => {
    dispatch(fetchLanguages())
    dispatch(fetchGroups())
    dispatch(fetchExports(exportsErrorKey))
  }, [dispatch])

  const location = useLocation()
  const resourceParam = new URLSearchParams(location.search).get("resource")

  // useMatch is exact by default, so the v5 `exact: true` flags are implied.
  const editorTemplateMatch = useMatch("/editor/:templateId")
  const editorExactMatch = useMatch("/editor")
  const editorResourceMatch = useMatch("/editor/resource/:collection/:id")

  useEffect(() => {
    if (isFirstMountWithUser && hasUser) {
      setFirstMountWithUser(false)
      if (editorTemplateMatch) {
        if (canCreate) {
          dispatch(
            newResourceCreator(
              editorTemplateMatch.params.templateId,
              templateErrorKey
            )
          ).then((result) => {
            if (!result) navigate("/templates")
          })
        } else {
          navigate("/dashboard")
        }
      } else if (resourceParam) {
        dispatch(
          loadResource(resourceParam, dashboardErrorKey, { keycloak })
        ).then((result) => {
          if (!result) {
            navigate("/dashboard")
            return
          }
          const [, resource] = result
          if (canEdit(resource)) {
            dispatch(
              dispatchResourceForEditor(result, resourceParam, {}, keycloak)
            )
            navigate("/editor")
          } else {
            dispatch(dispatchResourceForPreview(result))
            dispatch(showModal("PreviewModal"))
            navigate("/dashboard")
          }
        })
      } else if (editorExactMatch) {
        navigate("/dashboard")
      } else if (editorResourceMatch) {
        const uri = uriFromResourceId(
          editorResourceMatch.params.collection,
          editorResourceMatch.params.id
        )
        dispatch(loadResource(uri, dashboardErrorKey)).then((result) => {
          if (!result) {
            navigate("/dashboard")
            return
          }
          const [, resource] = result
          if (canEdit(resource)) {
            dispatch(dispatchResourceForEditor(result, uri, {}, keycloak))
          } else {
            dispatch(dispatchResourceForPreview(result))
            dispatch(showModal("PreviewModal"))
            navigate("/dashboard")
          }
        })
      }
    }
    dispatch(authenticate(keycloak))
  }, [
    hasUser,
    resourceParam,
    editorExactMatch,
    editorTemplateMatch,
    editorResourceMatch,
    canCreate,
    canEdit,
    dispatch,
    isFirstMountWithUser,
    navigate,
    // Stable for the life of KeycloakProvider (useState initializer), so
    // including it satisfies exhaustive-deps without causing extra runs.
    keycloak,
  ])

  // We do not use standard bootstrap modals (i.e. they are not triggered automatically)
  //  due to complexities in the interaction between JS and React/redux.
  //  This effect is used to prevent scrolling and dim the background behind the modal
  //  which is typically done automatically by bootstrap.
  useLayoutEffect(() => {
    const bodyRoot = document.getElementsByTagName("body")[0]
    if (isModalOpen) {
      // if *any* modals are open, prevent scrolling and dim the background
      bodyRoot.classList.add("modal-open")
    } else {
      bodyRoot.classList.remove("modal-open")
    }
  }, [isModalOpen])

  /*
   * react-router v6 notes for the routes below:
   *  - <Switch> became <Routes>, and render= became element=.
   *  - `exact` is the default, so the v5 flags are dropped. The two routes that
   *    were deliberately NOT exact in v5 ("/editor" and the "/vocabulary" set)
   *    keep prefix matching via an explicit "/*".
   *  - v5's path={[...]} arrays are not supported; each pattern is its own
   *    <Route>. The :element and :element/:sub patterns stay explicit because
   *    Vocab reads params.element/params.sub via useParams(); a splat route
   *    would only expose params["*"].
   *  - renderProps are gone; components that needed match/history now use hooks
   *    (Vocab -> useParams, NewResourceTemplateButton -> useNavigate).
   */
  const menuProps = { triggerHandleOffsetMenu: props.handleOffsetMenu }

  const routesWithCurrentUser = (
    <Routes>
      <Route path="/" element={<HomePage {...menuProps} />} />
      <Route path="/editor/*" element={<Editor {...menuProps} />} />
      <Route path="/templates" element={<ResourceTemplate {...menuProps} />} />
      <Route path="/search" element={<Search {...menuProps} />} />
      <Route path="/load" element={<LoadResource {...menuProps} />} />
      <Route path="/exports" element={<Exports {...menuProps} />} />
      <Route path="/dashboard" element={<Dashboard {...menuProps} />} />
      <Route path="/metrics/users" element={<UserMetrics {...menuProps} />} />
      <Route
        path="/metrics/templates"
        element={<TemplateMetrics {...menuProps} />}
      />
      <Route
        path="/metrics/resources"
        element={<ResourceMetrics {...menuProps} />}
      />
      <Route path="/vocabulary" element={<Vocab {...menuProps} />} />
      <Route path="/vocabulary/:element" element={<Vocab {...menuProps} />} />
      <Route
        path="/vocabulary/:element/:sub"
        element={<Vocab {...menuProps} />}
      />
      <Route path="/menu" element={<CanvasMenu />} />
      <Route path="*" element={<FourOhFour />} />
    </Routes>
  )

  const routesWithOutCurrentUser = (
    <Routes>
      <Route path="/vocabulary" element={<Vocab {...menuProps} />} />
      <Route path="/vocabulary/:element" element={<Vocab {...menuProps} />} />
      <Route
        path="/vocabulary/:element/:sub"
        element={<Vocab {...menuProps} />}
      />
      <Route path="*" element={<HomePage {...menuProps} />} />
    </Routes>
  )

  return (
    <HelmetProvider>
      <div id="app">
        <Helmet>
          {/*
           * Must be a SINGLE string child: react-helmet-async 3 no longer joins
           * multiple children for <title>, so `Sinopia {expr}` (two children)
           * renders an empty <title>. sinopiaEnv supplies its own " - " prefix.
           */}
          <title>{`Sinopia${Config.sinopiaEnv}`}</title>
        </Helmet>
        {hasUser ? routesWithCurrentUser : routesWithOutCurrentUser}
        <Footer />
      </div>
    </HelmetProvider>
  )
}

App.propTypes = {
  handleOffsetMenu: PropTypes.func,
}

export default App
