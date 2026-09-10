// Copyright 2021 Stanford University see LICENSE for license

import useEntitiesStore from "stores/entitiesStore"
import { hasGroups } from "selectors/groups"

import { getGroups } from "sinopiaApi"

export const fetchGroups = () => {
  if (hasGroups(useEntitiesStore.getState())) {
    return // Groups already loaded
  }

  return getGroups()
    .then((json) => {
      useEntitiesStore.getState().groupsReceived(json)
    })
    .catch(() => false)
}

export const noop = () => {}
