export function getLocal<T extends Record<string, any>>(key: string | T) {
  return chrome.storage.local.get(key) as Promise<T>
}

export function setLocal<T extends Record<string, any>>(key: T) {
  return chrome.storage.local.set(key) as Promise<void>
}

export function getSession<T extends Record<string, any>>(key: string | T) {
  const storageArea = chrome.storage.session || chrome.storage.local
  return storageArea.get(key) as Promise<T>
}

export function setSession<T extends Record<string, any>>(key: T) {
  const storageArea = chrome.storage.session || chrome.storage.local
  return storageArea.set(key) as Promise<void>
}
