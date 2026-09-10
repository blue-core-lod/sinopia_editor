import { useRef, useEffect } from "react"
import useEntitiesStore from "stores/entitiesStore"

const useResourceHasChanged = (value) => {
  // This indicates whether setResourceChanged has been called.
  // Using a ref for this because don't want to trigger rerender when changes.
  const hasDispatchedChanged = useRef(false)

  useEffect(() => {
    hasDispatchedChanged.current = false
  }, [value])

  const handleKeyDown = () => {
    if (!hasDispatchedChanged.current) {
      useEntitiesStore.getState().setResourceChanged(value.rootSubjectKey)
      hasDispatchedChanged.current = true
    }
  }

  return handleKeyDown
}

export default useResourceHasChanged
