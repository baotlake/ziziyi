import { describe, test, expect } from "vitest"
import { getCookieDomains } from "../src/utils"

describe("src/utils.ts", () => {
  test("test: getCookieDomains", () => {
    expect(getCookieDomains("www.example.com")).toEqual([
      "www.example.com",
      ".example.com",
    ])
    expect(getCookieDomains("www.example.com", 1)).toEqual([
      "www.example.com",
      ".example.com",
      ".com",
    ])
    expect(getCookieDomains("www.example.com", 0)).toEqual([
      "www.example.com",
      ".example.com",
      ".com",
      ".",
    ])
    // Extension domains
    expect(getCookieDomains("lilckelmopbcffmglfmfhelaajhjpcff")).toEqual([
      "lilckelmopbcffmglfmfhelaajhjpcff",
    ])
  })
})
