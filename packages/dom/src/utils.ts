export function waitDomState(
  state: Exclude<DocumentReadyState, "loading"> = "complete",
  timeout?: number
) {
  return new Promise<void>((resolve, reject) => {
    if (document.readyState === state || document.readyState === "complete") {
      return resolve()
    } else {
      document.addEventListener("readystatechange", function onChange() {
        if (
          document.readyState === state ||
          document.readyState === "complete"
        ) {
          document.removeEventListener("readystatechange", onChange)
          resolve()
        }
      })
    }
    if (timeout) {
      setTimeout(() => reject("timeout"), timeout)
    }
  })
}

export function setSearchParams(
  params: Record<string, string | number>,
  url?: string
) {
  const u = new URL(url || location.href)
  for (const [key, value] of Object.entries(params)) {
    u.searchParams.set(key, value.toString())
  }
  return u.href
}

/** support `data-fallback` attr */
export function handleImgError(e: Event) {
  const img = e.target
  if (!img || !(img instanceof HTMLImageElement)) return
  if (!img.dataset.fallback) return
  if (img.src == img.dataset.fallback) return
  setTimeout(() => {
    img.dataset.src = img.src || ""
    img.src = img.dataset.fallback || ""
  }, 100)
}

export function getPageIcon() {
  const icons = document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
  for (let item of icons) {
    if (item.getAttribute("type") == "image/svg+xml") {
      return item.href
    }
    if (parseInt(item.getAttribute("sizes") || "0") >= 90) {
      return item.href
    }
  }

  if (icons.length) {
    return icons[0].href
  }

  const touchIcon = document.querySelector<HTMLLinkElement>(
    'link[rel="apple-touch-icon"]'
  )
  if (touchIcon) {
    return touchIcon.href
  }

  return location.origin + "/favicon.ico"
}

export function getCookieDomains(host: string, minLevel = 2): string[] {
  const hostTokens = host.split(".")
  const list = [host]

  for (let i = 1; i <= hostTokens.length - minLevel; i++) {
    const domain = "." + hostTokens.slice(i).join(".")
    list.push(domain)
  }

  return list
}
