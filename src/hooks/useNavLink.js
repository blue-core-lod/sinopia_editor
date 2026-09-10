import { useEffect } from "react"
import useEditorStore from "stores/editorStore"
import { stickyScrollIntoView } from "utilities/Utilities"

const useNavLink = (navObj) => {
  const isCurrentProperty = useEditorStore(
    (state) =>
      state.currentComponent[navObj.rootSubjectKey]?.property ===
      navObj.rootPropertyKey
  )
  const isCurrentComponent = useEditorStore(
    (state) =>
      state.currentComponent[navObj.rootSubjectKey]?.component === navObj.key
  )
  const navLinkId = `navLink-${navObj.key}`
  const navTargetId = `navTarget-${navObj.key}`

  // This causes the component to scroll into view when first mounted if current component.
  useEffect(() => {
    if (!isCurrentComponent) return

    stickyScrollIntoView(`#${navLinkId}`)

    // This is only on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNavLinkClick = (event) => {
    event.preventDefault()

    stickyScrollIntoView(`#${navTargetId}`)
    useEditorStore
      .getState()
      .setCurrentComponent(
        navObj.rootSubjectKey,
        navObj.rootPropertyKey,
        navObj.key
      )
  }

  return { navLinkId, handleNavLinkClick, isCurrentProperty }
}

export default useNavLink
