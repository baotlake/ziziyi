import { useEffect, useState } from "react"

type ManifestPermission = chrome.runtime.ManifestPermission

type PermissionState<T extends ManifestPermission> = Record<T, boolean> & {
  origins: string[]
}

export function usePermissions<T extends ManifestPermission>(
  permissionsList: T[]
) {
  const initialPermissions = Object.fromEntries(
    permissionsList.map((k) => [k, false])
  ) as Record<T, boolean>

  const [loading, setLoading] = useState(true)

  const [permissions, setState] = useState<PermissionState<T>>({
    ...initialPermissions,
    origins: [],
  })

  useEffect(() => {
    if (!globalThis.chrome?.permissions) {
      setLoading(false)
      return
    }

    let mounted = true

    const sync = async () => {
      setLoading(true)

      const all = await chrome.permissions.getAll()

      if (!mounted) return

      const permissionMap = Object.fromEntries(
        permissionsList.map((key) => [
          key,
          (all.permissions || []).includes(key as ManifestPermission),
        ])
      ) as Record<T, boolean>

      setState({
        ...permissionMap,
        origins: all.origins || [],
      })

      setLoading(false)
    }

    sync()

    const handleAdded = (perms: chrome.permissions.Permissions) => {
      setState((prev) => ({
        ...prev,
        origins: perms.origins?.length
          ? Array.from(new Set([...prev.origins, ...perms.origins]))
          : prev.origins,
        ...Object.fromEntries((perms.permissions || []).map((p) => [p, true])),
      }))
    }

    const handleRemoved = (perms: chrome.permissions.Permissions) => {
      setState((prev) => ({
        ...prev,
        origins: perms.origins?.length
          ? prev.origins.filter((o) => !perms.origins!.includes(o))
          : prev.origins,
        ...Object.fromEntries((perms.permissions || []).map((p) => [p, false])),
      }))
    }

    chrome.permissions.onAdded.addListener(handleAdded)
    chrome.permissions.onRemoved.addListener(handleRemoved)

    return () => {
      mounted = false
      chrome.permissions.onAdded.removeListener(handleAdded)
      chrome.permissions.onRemoved.removeListener(handleRemoved)
    }
  }, [permissionsList])

  return {
    permissions,
    loading,
  }
}
