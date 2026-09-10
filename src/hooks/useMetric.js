import { useEffect, useState, useRef } from "react"
import { metricsErrorKey } from "utilities/errorKeyFactory"
import useEditorStore from "stores/editorStore"
import * as sinopiaMetrics from "../sinopiaMetrics"

const useMetric = (name, params = null, runMetric = true) => {
  const [metric, setMetric] = useState(null)
  const isMountedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!runMetric) return setMetric({ count: 0 })
    sinopiaMetrics[name](params || {})
      .then((results) => {
        if (isMountedRef.current) setMetric(results)
      })
      .catch((err) => {
        if (isMountedRef.current) {
          useEditorStore
            .getState()
            .addError(
              metricsErrorKey,
              `Error retrieving metrics: ${err.message || err}`
            )
        }
      })
  }, [name, params, runMetric])

  return metric
}

export default useMetric
