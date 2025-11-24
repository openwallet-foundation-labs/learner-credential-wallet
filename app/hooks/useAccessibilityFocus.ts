import { useEffect, useState, useRef, useMemo, Ref } from 'react'
import { findNodeHandle, AccessibilityInfo } from 'react-native'

export function useAccessibilityFocus<T>(): [Ref<T>, () => void] {
  const [doFocus, setDoFocus] = useState(false)
  const ref = useRef(null)
  const reactTag = useMemo(() => findNodeHandle(ref?.current), [ref.current])

  useEffect(() => {
    if (doFocus && ref.current !== null && reactTag !== null) {
      setTimeout(() => AccessibilityInfo.setAccessibilityFocus(reactTag), 1)
      setDoFocus(false)
    }

    return () => setDoFocus(false)
  }, [doFocus, ref])

  function focus(): void {
    setDoFocus(true)
  }

  return [ref, focus]
}
