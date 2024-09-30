import { getLocal, getSession } from "../utils/api"
import { onUnmounted, onMounted, reactive } from "vue"

type Options = {
  session?: boolean
}
export default function useStorage<T extends Record<string, any>>(
  keys: T,
  options?: Options
) {
  const data = reactive(keys)

  const listener = (changes: {
    [key: string]: chrome.storage.StorageChange
  }) => {
    for (const key in changes) {
      if (key in keys) {
        data[key] = changes[key].newValue ?? keys[key]
      }
    }
  }

  const storageArea = options?.session
    ? chrome.storage.session
    : chrome.storage.local

  onMounted(() => {
    const p = options?.session ? getSession(keys) : getLocal(keys)
    p.then((value) => {
      Object.entries(value).forEach(([key, value]) => {
        data[key] = value
      })
    })

    storageArea.onChanged.addListener(listener)
  })

  onUnmounted(() => {
    storageArea.onChanged.removeListener(listener)
  })

  return data
}

export { useStorage }
