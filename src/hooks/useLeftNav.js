import useEntitiesStore from "stores/entitiesStore"

const useLeftNav = (navObj) => {
  // navObj can be a subject or property.
  const isExpanded = navObj.showNav

  const handleToggleClick = (event) => {
    event.preventDefault()

    if (navObj.subjectTemplateKey) {
      if (isExpanded) {
        useEntitiesStore.getState().hideNavSubject(navObj.key)
      } else {
        useEntitiesStore.getState().showNavSubject(navObj.key)
      }
    } else if (isExpanded) {
      useEntitiesStore.getState().hideNavProperty(navObj.key)
    } else {
      useEntitiesStore.getState().showNavProperty(navObj.key)
    }
  }

  return { handleToggleClick, isExpanded }
}

export default useLeftNav
