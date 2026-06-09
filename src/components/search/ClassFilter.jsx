// Copyright 2019 Stanford University see LICENSE for license
import React from "react"
import SearchFilter from "./SearchFilter"
import { resourceToName } from "utilities/Utilities"

const ClassFilter = () => (
  <SearchFilter
    label="Filter by"
    facet="types"
    filterSearchOption="typeFilter"
    filterLabelFunc={resourceToName}
  />
)

export default ClassFilter
