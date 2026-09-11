import { onMounted, onUnmounted, reactive, readonly, ref } from "vue"

type StorageAreaName = "local" | "session" | "sync" | "managed"

type Options = {
  area?: StorageAreaName
}

export default function useStorageState<T extends Record<string, any>>(
  defaults: T,
  options?: Options
) {
  const state = reactive({ ...defaults })
  const loading = ref(true)
  let storageArea: chrome.storage.StorageArea | undefined

  const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
    for (const key in changes) {
      if (Object.prototype.hasOwnProperty.call(defaults, key)) {
        state[key] = changes[key].newValue ?? defaults[key]
      }
    }
  }

  onMounted(async () => {
    if (typeof chrome === "undefined" || !chrome.storage) {
      loading.value = false
      return
    }

    storageArea = chrome.storage[options?.area || "local"]
    storageArea.onChanged.addListener(listener)

    try {
      Object.assign(state, await storageArea.get(defaults))
    } catch (error) {
      console.warn("Failed to load extension storage; using defaults", error)
    } finally {
      loading.value = false
    }
  })

  onUnmounted(() => storageArea?.onChanged.removeListener(listener))

  return { state, loading: readonly(loading) }
}

export { useStorageState }
