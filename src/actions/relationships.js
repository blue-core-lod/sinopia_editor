export const setRelationships = (resourceKey, relationships) => ({
  type: "SET_RELATIONSHIPS",
  payload: {
    resourceKey,
    relationships,
  },
})

export const clearRelationships = (resourceKey) => ({
  type: "CLEAR_RELATIONSHIPS",
  payload: resourceKey,
})
