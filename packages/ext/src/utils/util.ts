export function isEdge() {
  return /Edg/.test(navigator.userAgent)
}

const EDGE_PROTECTED_HOSTS = ["microsoftedge.microsoft.com"]
const CHROME_PROTECTED_HOSTS = [
  "chromewebstore.google.com",
  "chrome.google.com",
]

export function isProtectedUrl(url: string) {
  try {
    const u = new URL(url)
    if (!["http:", "https:"].includes(u.protocol)) {
      return true
    }

    const edge = isEdge()
    if (edge && EDGE_PROTECTED_HOSTS.includes(u.hostname)) {
      return true
    }

    if (CHROME_PROTECTED_HOSTS.includes(u.hostname)) {
      return true
    }

    return false
  } catch (err) {
    console.warn(err)
  }

  return true
}

type StoreUrlOptions = {
  id?: string
  name?: string
  reviews?: boolean
  support?: boolean
  utm_source?: string
  utm_id?: string
  utm_medium?: string
}

export function chromeWebStoreUrl({
  id,
  name,
  reviews,
  support,
  utm_source,
  utm_id,
  utm_medium,
}: StoreUrlOptions) {
  id = id || chrome.runtime.id
  name = name ? name.replace(/\s+/, "-").toLowerCase() : ""

  const u = new URL("https://chromewebstore.google.com/")
  const slug = name.replace(/[\s/]+/g, "-") || "-"
  u.pathname = `/detail/${slug}/${id}`
  if (reviews) {
    u.pathname = u.pathname + "/reviews"
  } else if (support) {
    u.pathname = u.pathname + "/support"
  }

  if (utm_source) u.searchParams.set("utm_source", utm_source)
  if (utm_id) u.searchParams.set("utm_id", utm_id)
  if (utm_medium) u.searchParams.set("utm_medium", utm_medium)

  return u.href
}

export function edgeAddonsUrl({
  id,
  name,
  reviews,
  support,
  utm_source,
  utm_id,
  utm_medium,
}: StoreUrlOptions) {
  id = id || chrome.runtime.id
  name = name ? name.replace(/\s+/, "-").toLowerCase() : ""

  const u = new URL("https://microsoftedge.microsoft.com")
  const slug = name.replace(/[\s/]+/g, "-") || "-"
  u.pathname = `/addons/detail/${slug}/${id}`

  if (utm_source) u.searchParams.set("utm_source", utm_source)
  if (utm_id) u.searchParams.set("utm_id", utm_id)
  if (utm_medium) u.searchParams.set("utm_medium", utm_medium)

  return u.href
}
