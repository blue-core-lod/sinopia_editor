import { useDispatch } from "react-redux"
import {
  fetchSinopiaSearchResults as fetchSinopiaSearchResultsCreator,
  fetchTemplateGuessSearchResults as fetchTemplateGuessSearchResultsCreator,
} from "actionCreators/search"
import { clearSearchResults } from "actions/search"
import { useHistory } from "react-router-dom"

const useSearch = (errorKey) => {
  const dispatch = useDispatch()
  const history = useHistory()

  const fetchSearchResults = (
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

  const fetchNewSearchResults = (queryString, searchOptions = {}, keycloak) => {
    fetchSearchResults(queryString, searchOptions, 0, keycloak).then(
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
