// Copyright 2019 Stanford University see LICENSE for license

import authorityConfig from "../../static/authorityConfig.json"

const authorityConfigMap = {}
authorityConfig.forEach(
  (configItem) => (authorityConfigMap[configItem.uri] = configItem)
)

export const findAuthorityConfig = (searchUri) => authorityConfigMap[searchUri]

export const sinopiaSearchUri = "urn:ld4p:sinopia"

// Searched live through the Blue Core API rather than loaded into it. Not a QA
// authority, so it is dispatched separately from the entries in
// authorityConfig.json.
export const locSearchUri = "urn:bluecore:loc"
