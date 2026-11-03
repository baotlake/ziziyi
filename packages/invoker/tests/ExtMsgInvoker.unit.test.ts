import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ExtMsgInvoker } from "../src/ExtMsgInvoker"

let listeners: Set<Function>
let sendMessage: ReturnType<typeof vi.fn>
beforeEach(() => {
  listeners = new Set()
  sendMessage = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal("chrome", {
    runtime: {
      sendMessage,
      onMessage: {
        addListener: (fn: Function) => listeners.add(fn),
        removeListener: (fn: Function) => listeners.delete(fn),
      },
    },
    tabs: { sendMessage },
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
const request = (extra = {}) => ({
  type: "invoke-request",
  func: "known",
  _key: "key",
  _id: "other",
  ...extra,
})
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("ExtMsgInvoker response ownership", () => {
  it("does not claim unknown, unrelated, self-origin or differently addressed requests", () => {
    const invoker = new ExtMsgInvoker("test", { perferReceiptResponse: true })
    invoker.add("known", () => "ok")
    const response = vi.fn()
    for (const msg of [
      null,
      {},
      request({ func: "missing" }),
      request({ name: "other" }),
      request({ _id: (invoker as any).uniqueId }),
      { type: "other" },
    ]) {
      expect(invoker.handleMessage(msg, {}, response)).toBeUndefined()
    }
    expect(response).not.toHaveBeenCalled()
  })

  it("claims RPC and returns exactly one receipt", async () => {
    const invoker = new ExtMsgInvoker("test", { perferReceiptResponse: true })
    invoker.add("known", () => "ok")
    const response = vi.fn()
    expect(invoker.handleMessage(request(), {}, response)).toBe(true)
    await flush()
    expect(response).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ success: true, value: "ok" })
    )
  })

  it("handles notification without holding the native channel", async () => {
    const invoker = new ExtMsgInvoker("test", { perferReceiptResponse: true })
    const service = vi.fn()
    invoker.add("known", service)
    const response = vi.fn()
    expect(
      invoker.handleMessage(request({ reply: false }), {}, response)
    ).toBeUndefined()
    await flush()
    expect(service).toHaveBeenCalledOnce()
    expect(response).not.toHaveBeenCalled()
  })

  it("does not claim response messages", async () => {
    const invoker = new ExtMsgInvoker("test", { perferReceiptResponse: true })
    const response = vi.fn()
    expect(
      invoker.handleMessage(
        { type: "invoke-response", key: "old", success: true },
        {},
        response
      )
    ).toBeUndefined()
    expect(response).not.toHaveBeenCalled()
  })

  it("serializes service errors in receipts", async () => {
    const invoker = new ExtMsgInvoker("test", { perferReceiptResponse: true })
    invoker.add("known", () => {
      throw new Error("service failed")
    })
    const response = vi.fn()
    invoker.handleMessage(request(), {}, response)
    await flush()
    expect(response).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        value: { name: "Error", message: "service failed" },
      })
    )
  })

  it("does not send a receipt when a service returns IGNORE", async () => {
    const invoker = new ExtMsgInvoker("test", { perferReceiptResponse: true })
    invoker.add("known", () => invoker.IGNORE)
    const response = vi.fn()
    expect(invoker.handleMessage(request(), {}, response)).toBe(true)
    await flush()
    expect(response).not.toHaveBeenCalled()
  })

  it("supports wait-only recipients", async () => {
    const invoker = new ExtMsgInvoker("test", { perferReceiptResponse: true })
    const waiting = invoker.waitInvoke({ func: "known" })
    const response = vi.fn()
    expect(
      invoker.handleMessage(request({ args: ["value"] }), {}, response)
    ).toBeUndefined()
    await expect(waiting).resolves.toEqual(["value"])
    await flush()
    expect(response).not.toHaveBeenCalled()
  })

  it("awaits fallback response delivery and reports detached failure", async () => {
    const onError = vi.fn()
    const invoker = new ExtMsgInvoker("test", { onError })
    invoker.add("known", () => "ok")
    const error = new Error("receiver gone")
    sendMessage.mockRejectedValue(error)
    expect(
      invoker.handleMessage(request(), { tab: { id: 4 } } as any, vi.fn())
    ).toBeUndefined()
    await flush()
    expect(onError).toHaveBeenCalledWith(error)
  })

  it("keeps propagating notification delivery errors from invoke", async () => {
    const invoker = new ExtMsgInvoker("test", { perferReceiptResponse: true })
    const error = new Error("channel closed")
    sendMessage.mockRejectedValue(error)
    await expect(invoker.invoke({ func: "known", reply: false })).rejects.toBe(
      error
    )
  })

  it("reports notification execution failures without holding the response channel", async () => {
    const error = new Error("notification failed")
    const onError = vi.fn()
    const invoker = new ExtMsgInvoker("test", {
      perferReceiptResponse: true,
      onError,
    })
    invoker.add("known", () => {
      throw error
    })
    const response = vi.fn()
    expect(
      invoker.handleMessage(request({ reply: false }), {}, response)
    ).toBeUndefined()
    await flush()
    expect(onError).toHaveBeenCalledWith(error)
    expect(response).not.toHaveBeenCalled()
  })

  it("contains failures from diagnostic observers", async () => {
    const invoker = new ExtMsgInvoker("test", {
      onError: async () => {
        throw new Error("observer")
      },
    })
    invoker.add("known", () => "ok")
    sendMessage.mockRejectedValue(new Error("receiver gone"))
    invoker.handleMessage(request(), {}, vi.fn())
    await flush()
  })

  it("replies with a safe error when a service result cannot be serialized", async () => {
    const invoker = new ExtMsgInvoker("test", { perferReceiptResponse: true })
    invoker.add("known", () => 1n)
    const delivered: any[] = []
    const response = vi.fn((value: any) =>
      delivered.push(JSON.parse(JSON.stringify(value)))
    )
    expect(invoker.handleMessage(request(), {}, response)).toBe(true)
    await flush()
    expect(response).toHaveBeenCalledTimes(2)
    expect(delivered).toHaveLength(1)
    expect(delivered[0]).toMatchObject({
      key: "key",
      success: false,
      value: { name: "Error" },
    })
  })

  it("reports an unavailable response channel without broadcasting a replacement", async () => {
    const onError = vi.fn()
    const error = new Error("channel closed")
    const invoker = new ExtMsgInvoker("test", {
      perferReceiptResponse: true,
      onError,
    })
    invoker.add("known", () => "ok")
    invoker.handleMessage(request(), {}, () => {
      throw error
    })
    await flush()
    expect(onError).toHaveBeenCalledWith(error)
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it("preserves structured errors and custom Error fields at the Chrome boundary", async () => {
    const invoker = new ExtMsgInvoker("test", { perferReceiptResponse: true })
    const structured = { code: "AUTH_REQUIRED", message: "Please sign in" }
    const customError = Object.assign(new Error("Please sign in"), {
      code: "AUTH_REQUIRED",
    })
    for (const error of [structured, customError]) {
      invoker.add("known", () => {
        throw error
      })
      const response = vi.fn()
      invoker.handleMessage(request(), {}, response)
      await flush()
      expect(response).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          value: expect.objectContaining(structured),
        })
      )
    }
  })

  it("listen is idempotent and an old disposer cannot remove the new listener", () => {
    const invoker = new ExtMsgInvoker("test")
    const old = invoker.listen()
    const current = invoker.listen()
    old()
    expect(listeners.size).toBe(1)
    current()
    expect(listeners.size).toBe(0)
  })

  it("routes broadcast RPC only to the owner", async () => {
    const unrelated = new ExtMsgInvoker("test", { perferReceiptResponse: true })
    const owner = new ExtMsgInvoker("test", { perferReceiptResponse: true })
    owner.add("known", () => "owned")
    const response = vi.fn()
    expect(unrelated.handleMessage(request(), {}, response)).toBeUndefined()
    expect(owner.handleMessage(request(), {}, response)).toBe(true)
    await flush()
    expect(response).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ value: "owned" })
    )
  })
})

import { EventInvoker } from "../src/EventInvoker"

function broadcastBus() {
  const listeners = new Set<Function>()
  vi.stubGlobal("chrome", {
    runtime: {
      onMessage: {
        addListener(fn: Function) {
          listeners.add(fn)
        },
        removeListener(fn: Function) {
          listeners.delete(fn)
        },
      },
      sendMessage(message: any) {
        return new Promise((resolve) => {
          let responded = false
          let held = false
          const sendResponse = (value: any) => {
            if (!responded) {
              responded = true
              resolve(value === undefined ? null : value)
            }
          }
          for (const listener of listeners) {
            if (listener(message, {}, sendResponse) === true) held = true
          }
          if (!held && !responded) resolve(undefined)
        })
      },
    },
  })
}

it("a wait-only observer must not replace the owner RPC response", async () => {
  broadcastBus()
  const caller = new ExtMsgInvoker("app", { perferReceiptResponse: true })
  const observer = new ExtMsgInvoker("app", { perferReceiptResponse: true })
  const owner = new ExtMsgInvoker("app", { perferReceiptResponse: true })
  const observed = observer.waitInvoke({ func: "read" })
  owner.add("read", async () => {
    await new Promise((resolve) => setTimeout(resolve, 5))
    return "actual result"
  })
  observer.listen()
  owner.listen()
  const value = await caller.invoke({ func: "read", timeout: 40 })
  await expect(observed).resolves.toBeUndefined()
  expect(value).toBe("actual result")
})

it("IGNORE must allow a later owner response to win", async () => {
  broadcastBus()
  const caller = new ExtMsgInvoker("app", { perferReceiptResponse: true })
  const ignoring = new ExtMsgInvoker("app", { perferReceiptResponse: true })
  const owner = new ExtMsgInvoker("app", { perferReceiptResponse: true })
  ignoring.add("read", () => ignoring.IGNORE)
  owner.add("read", async () => {
    await new Promise((resolve) => setTimeout(resolve, 5))
    return "actual result"
  })
  ignoring.listen()
  owner.listen()
  const outcome = await caller
    .invoke({ func: "read", timeout: 40 })
    .catch((error) => `ERROR: ${error.message}`)
  expect(outcome).toBe("actual result")
})

it("preserves structured service errors over EventInvoker", async () => {
  const target = new EventTarget()
  const caller = new EventInvoker("app", { target })
  const owner = new EventInvoker("app", { target })
  const error = { code: "AUTH_REQUIRED", message: "Please sign in" }
  owner.add("read", () => {
    throw error
  })
  caller.listen()
  owner.listen()
  try {
    await expect(caller.invoke({ func: "read", timeout: 40 })).rejects.toEqual(
      error
    )
  } finally {
    caller.unlisten()
    owner.unlisten()
  }
})

it("preserves Error identity and falsy rejection values over EventInvoker", async () => {
  const target = new EventTarget()
  const caller = new EventInvoker("app", { target })
  const owner = new EventInvoker("app", { target })
  caller.listen()
  owner.listen()
  try {
    for (const value of [
      new Error("original"),
      null,
      undefined,
      false,
      0,
      "",
    ]) {
      owner.add("read", () => {
        throw value
      })
      await expect(caller.invoke({ func: "read", timeout: 40 })).rejects.toBe(
        value
      )
    }
  } finally {
    caller.unlisten()
    owner.unlisten()
  }
})
