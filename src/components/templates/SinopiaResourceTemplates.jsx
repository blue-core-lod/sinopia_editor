// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import ResourceTemplateSearchResult from "./ResourceTemplateSearchResult"
import useHistoryStore from "stores/historyStore"
import useSearchStore from "stores/searchStore"
import ExpandingResourceTemplates from "./ExpandingResourceTemplates"
import _ from "lodash"

/**
 * This is the list view of all the templates
 */
const SinopiaResourceTemplates = () => {
  const searchResults = useSearchStore((state) => state.template?.results)
  const historicalTemplates = useHistoryStore((state) => state.templates)

  return (
    <section id="resource-templates">
      <ExpandingResourceTemplates
        label="Most recently used templates"
        id="historicalTemplates"
        results={historicalTemplates}
      />
      {_.isEmpty(searchResults) ? (
        <div className="alert alert-warning" id="no-rt-warning">
          No resource templates match.
        </div>
      ) : (
        <ResourceTemplateSearchResult results={searchResults} />
      )}
    </section>
  )
}

export default SinopiaResourceTemplates
