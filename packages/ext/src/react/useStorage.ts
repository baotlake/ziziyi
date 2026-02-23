import { useState, useEffect } from "react"


type Options = {
    area?: "session" | "local" | "sync" | "managed"
}

export default function useStorage<T extends Record<string, any>>(
    keys: T,
    options?: Options
) {
    const [data, setData] = useState<T>(keys)

    useEffect(() => {
        const area = options?.area || "local"
        const storageArea = chrome.storage[area] || chrome.storage.local

        const listener = (changes: {
            [key: string]: chrome.storage.StorageChange
        }) => {
            const updates: Partial<T> = {}
            let hasUpdates = false

            for (const key in changes) {
                if (Object.prototype.hasOwnProperty.call(keys, key)) {
                    updates[key as keyof T] = changes[key].newValue ?? keys[key]
                    hasUpdates = true
                }
            }

            if (hasUpdates) {
                setData((prev: T) => ({ ...prev, ...updates }))
            }
        }

        // Initial fetch
        let p: Promise<T>
        if (storageArea) {
            p = storageArea.get(keys) as Promise<T>
        } else {
            p = Promise.resolve(keys)
        }

        p.then((value) => {
            setData((prev: T) => ({ ...prev, ...value }))
        })

        if (storageArea && storageArea.onChanged) {
            storageArea.onChanged.addListener(listener)
        }

        return () => {
            if (storageArea && storageArea.onChanged) {
                storageArea.onChanged.removeListener(listener)
            }
        }
    }, []) // Empty dependency array to simulate onMounted

    return data
}

export { useStorage }
