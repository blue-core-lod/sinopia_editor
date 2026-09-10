import { useEffect } from "react"
import useEditorStore from "stores/editorStore"
import { stickyScrollIntoView } from "utilities/Utilities"

const useNavTarget = (navObj) => {
  const isCurrentComponent = useEditorStore(
    (state) =>
      state.currentComponent[navObj.rootSubjectKey]?.component === navObj.key
  )

  const navTargetId = `navTarget-${navObj.key}`

  // This causes the component to scroll into view when first mounted if current component.
  useEffect(() => {
    if (!isCurrentComponent) return

    window.scrollTo(0, 0)
    stickyScrollIntoView(`#${navTargetId}`)

    // This is only on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNavTargetClick = (event) => {
    useEditorStore
      .getState()
      .setCurrentComponent(
        navObj.rootSubjectKey,
        navObj.rootPropertyKey,
        navObj.key
      )
    event.stopPropagation()
  }

  return { navTargetId, handleNavTargetClick }
}

export default useNavTarget
