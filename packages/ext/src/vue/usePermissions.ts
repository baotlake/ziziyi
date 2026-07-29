import { reactive, onMounted, onUnmounted, watch } from "vue"

type Permissions = chrome.permissions.Permissions
type ManifestPermission = chrome.runtime.ManifestPermission

export default function usePermissions() {
  const permissions = reactive<ManifestPermission[]>([])

  onMounted(() => {
    getPermissions()

    chrome.permissions.onAdded.addListener(handleAdded)
    chrome.permissions.onRemoved.addListener(handleRemoved)
  })

  onUnmounted(() => {
    chrome.permissions.onAdded.removeListener(handleAdded)
    chrome.permissions.onRemoved.removeListener(handleRemoved)
  })

  function handleAdded(p: Permissions) {
    permissions.push(...(p.permissions || []))
  }
  function handleRemoved(p: Permissions) {
    const filtered = permissions.filter((v) => !p.permissions?.includes(v))
    permissions.splice(0, permissions.length, ...filtered)
  }

  const getPermissions = async () => {
    const all = await chrome.permissions.getAll()
    permissions.splice(0, permissions.length, ...(all.permissions || []))
  }

  return permissions
}

export function usePermission<
  T extends { [key in ManifestPermission]?: boolean }
>(p: T) {
  const permissions = usePermissions()
  const permission = reactive<{ [key in ManifestPermission]?: boolean }>(p)

  watch(permissions, () => {
    for (const key in permission) {
      permission[key as keyof typeof permission] = permissions.includes(
        key as ManifestPermission
      )
    }
  })

  return permission as T
}
