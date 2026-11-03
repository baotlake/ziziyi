type MaybeWrapped<T extends object> = T & {
  wrappedJSObject?: T
}

/** Unwraps a Firefox Xray wrapper when available, otherwise returns the input. */
export function getWrappedJSObject<T extends object>(value: T): T {
  return (value as MaybeWrapped<T>).wrappedJSObject ?? value
}

export function appendAdoptedStyleSheets(
  root: ShadowRoot | Document,
  styleSheet: CSSStyleSheet
) {
  let target: CSSStyleSheet[]

  try {
    const sheets = root.adoptedStyleSheets
    target = getWrappedJSObject(sheets)
    if (target === sheets) {
      root.adoptedStyleSheets = [...sheets, styleSheet]
      return
    }
  } catch (error) {
    // Older Firefox releases can throw while reading the ObservableArray
    // itself, so unwrap the DOM reflector as a compatibility fallback.
    const targetRoot = getWrappedJSObject(root)
    if (targetRoot === root) throw error
    target = targetRoot.adoptedStyleSheets
  }

  // Xray wrappers expose the ObservableArray's backing object at runtime.
  // Mutating it avoids assigning an Array from the content-script realm.
  Array.prototype.push.call(target, styleSheet)
}
