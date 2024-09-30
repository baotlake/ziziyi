export function genSessionId() {
  const d = new Date()
  const T = Math.floor(d.getTime() / 1000)

  const lang = navigator.language.toUpperCase()
  const region = `${d.getHours()}${d.getMinutes()}${lang}`

  return `T=${T}:R=${region}`
}
