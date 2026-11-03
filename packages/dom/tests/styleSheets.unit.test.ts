import { describe, expect, it } from "vitest"
import {
  appendAdoptedStyleSheets,
  getWrappedJSObject,
} from "../src"

describe("getWrappedJSObject", () => {
  it("returns the wrapped object when Firefox exposes one", () => {
    const wrapped = { value: 1 }
    const value = { wrappedJSObject: wrapped }

    expect(getWrappedJSObject(value)).toBe(wrapped)
  })

  it("returns the original object without an Xray wrapper", () => {
    const value = { value: 1 }

    expect(getWrappedJSObject(value)).toBe(value)
  })
})

describe("appendAdoptedStyleSheets", () => {
  it("updates an Xray-wrapped ObservableArray", () => {
    const sheet = {} as CSSStyleSheet
    const wrapped: CSSStyleSheet[] = []
    const root = {
      adoptedStyleSheets: { wrappedJSObject: wrapped },
    } as unknown as Document

    appendAdoptedStyleSheets(root, sheet)

    expect(wrapped).toEqual([sheet])
  })

  it("unwraps the root when an older Xray wrapper rejects the getter", () => {
    const sheet = {} as CSSStyleSheet
    const wrapped: CSSStyleSheet[] = []
    const root = {
      wrappedJSObject: { adoptedStyleSheets: wrapped },
    } as unknown as Document
    Object.defineProperty(root, "adoptedStyleSheets", {
      get() {
        throw new Error("Accessing from Xray wrapper is not supported")
      },
    })

    appendAdoptedStyleSheets(root, sheet)

    expect(wrapped).toEqual([sheet])
  })

  it("keeps the standard assignment path without an Xray wrapper", () => {
    const first = {} as CSSStyleSheet
    const second = {} as CSSStyleSheet
    const root = {
      adoptedStyleSheets: [first],
    } as unknown as Document

    appendAdoptedStyleSheets(root, second)

    expect(root.adoptedStyleSheets).toEqual([first, second])
  })
})
