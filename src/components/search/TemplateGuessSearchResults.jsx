// Copyright 2019 Stanford University see LICENSE for license
import React from "react"
import useSearchStore from "stores/searchStore"
import ExpandingResourceTemplates from "../templates/ExpandingResourceTemplates"

const TemplateGuessSearchResults = () => {
  const searchResults = useSearchStore((state) => state.templateguess?.results)

  return (
    <ExpandingResourceTemplates
      id="template-guess"
      label="Template results"
      results={searchResults}
    />
  )
}

export default TemplateGuessSearchResults
