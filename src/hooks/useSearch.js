import { useDispatch } from "react-redux"
import {
  fetchSinopiaSearchResults as fetchSinopiaSearchResultsCreator,
  fetchQASearchResults as fetchQASearchResultsCreator,
  fetchTemplateGuessSearchResults as fetchTemplateGuessSearchResultsCreator,
} from "actionCreators/search"
import { clearSearchResults } from "actions/search"
import { sinopiaSearchUri } from "utilities/authorityConfig"
import { useHistory } from "react-router-dom"

const useSearch = (errorKey) => {
  const dispatch = useDispatch()
  const history = useHistory()

  const fetchQASearchResults = (
    queryString,
    uri,
    searchOptions,
    startOfRange
  ) =>
    dispatch(
      fetchQASearchResultsCreator(queryString, uri, errorKey, {
        ...searchOptions,
        startOfRange,
      })
    )

  const fetchSinopiaSearchResults = (
    queryString,
    searchOptions,
    startOfRange,
    keycloak
  ) =>
    dispatch(
      fetchSinopiaSearchResultsCreator(
        queryString,
        {
          ...searchOptions,
          startOfRange,
        },
        errorKey,
        keycloak
      )
    )

  const fetchSearchResults = (
    queryString,
    uri,
    searchOptions,
    startOfRange,
    keycloak
  ) => {
    if (uri === sinopiaSearchUri) {
      return fetchSinopiaSearchResults(
        queryString,
        searchOptions,
        startOfRange,
        keycloak
      )
    }
    return fetchQASearchResults(queryString, uri, searchOptions, startOfRange)
  }

  const fetchNewSearchResults = (
    queryString,
    uri,
    searchOptions = {},
    keycloak
  ) => {
    fetchSearchResults(queryString, uri, searchOptions, 0, keycloak).then(
      (result) => {
        if (result) history.push("/search")
      }
    )
  }

  const fetchTemplateGuessSearchResults = (
    queryString,
    searchOptions = { startOfRange: 0 }
  ) =>
    dispatch(
      fetchTemplateGuessSearchResultsCreator(
        queryString,
        errorKey,
        searchOptions
      )
    )

  const clearTemplateGuessSearchResults = () => {
    dispatch(clearSearchResults("templateguess"))
  }

  return {
    fetchSearchResults,
    fetchNewSearchResults,
    fetchTemplateGuessSearchResults,
    clearTemplateGuessSearchResults,
  }
}

export default useSearch
