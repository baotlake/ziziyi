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

/** Need `favicon` permission */
export function faviconURL(url: string, size = 64) {
  const u = new URL(chrome.runtime.getURL("/_favicon/"))
  const pureUrl = url.split(/[?#]/)[0]
  u.searchParams.set("pageUrl", pureUrl)
  u.searchParams.set("size", size.toString())
  return u.href
}
