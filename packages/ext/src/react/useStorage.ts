import { useState, useEffect } from "react"

type Options = {
  area?: "session" | "local" | "sync" | "managed"
}

export default function useStorage<T extends Record<string, any>>(
  keys: T,
  options?: Options,
) {
  const [state, setState] = useState<T>(keys)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage) return

    const area = options?.area || "local"
    const storageArea = chrome.storage[area] ?? chrome.storage.local

    const listener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      areaName,
    ) => {
      if (areaName !== area) return

      const updates: Partial<T> = {}
      let hasUpdates = false

      for (const key in changes) {
        if (Object.prototype.hasOwnProperty.call(keys, key)) {
          updates[key as keyof T] = (changes[key]?.newValue ?? keys[key]) as T[keyof T]
          hasUpdates = true
        }
      }

      if (hasUpdates) {
        setState((prev: T) => ({ ...prev, ...updates }))
      }
    }

    storageArea.get(keys, (value) => {
      setState((prev: T) => ({ ...prev, ...(value as T) }))
      setLoading(false)
    })

    chrome.storage.onChanged.addListener(listener)

    return () => {
      chrome.storage.onChanged.removeListener(listener)
    }
  }, [])

  return { state, loading }
}

export { useStorage }
