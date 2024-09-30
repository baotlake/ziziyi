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

