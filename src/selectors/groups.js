// Copyright 2021 Stanford University see LICENSE for license
import _ from "lodash"

export const hasGroups = (state) => !_.isEmpty(state.groupMap)

export const selectGroupMap = (state) => state.groupMap

export const noop = () => {}
