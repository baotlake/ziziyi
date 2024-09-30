/**
 * sync extension storage to local storage, DO NOT USE IN PROD
 */
export function DEV_syncStorage() {
  const syncStorage = (area: "local" | "session") => {
    const storage = area === "local" ? localStorage : sessionStorage
    const extStorage =
      area === "local" ? chrome.storage.local : chrome.storage.session

    const updateChromeStorage = (key: string, value: any) => {
      if (value === null) {
        extStorage.remove(key)
      } else {
        extStorage.set({ [key]: value })
      }
    }

    const updateLocalStorage = (key: string, value: any) => {
      if (value === undefined) {
        storage.removeItem(key)
      } else {
        storage.setItem(key, JSON.stringify(value))
      }
    }

    extStorage.get(null).then((data: any) => {
      Object.entries(data).forEach(([key, value]) => {
        updateLocalStorage(key, value)
      })
    })

    chrome.storage.onChanged.addListener((changes, changedArea) => {
      if (changedArea === area) {
        Object.entries(changes).forEach(([key, { newValue }]) => {
          updateLocalStorage(key, newValue)
        })
      }
    })

    window.addEventListener("storage", (e) => {
      const { key, newValue, storageArea } = e
      if (storageArea === storage) {
        const value = newValue ? JSON.parse(newValue) : null
        updateChromeStorage(key!, value)
      }
    })
  }

  syncStorage("local")
  syncStorage("session")
}
