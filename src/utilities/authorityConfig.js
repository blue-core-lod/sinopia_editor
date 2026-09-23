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

// Suffix picks the BIBFRAME class, mirroring how the Sinopia entries above use
// "urn:ld4p:sinopia/Work".
export const locSearchUriPrefix = "urn:bluecore:loc"

export const isLocSearchUri = (uri) =>
  typeof uri === "string" && uri.startsWith(locSearchUriPrefix)

// Bare id searches every BIBFRAME class, matching what the Blue Core entries
// above do; a suffix narrows it.
export const locSearchType = (uri) =>
  uri === locSearchUri ? "all" : uri.slice(locSearchUriPrefix.length + 1)
