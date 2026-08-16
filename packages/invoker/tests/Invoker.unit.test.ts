import { describe, expect, it } from "vitest"
import Invoker, {
  type InvokeReq,
  type InvokeReqMsg,
  type InvokeRes,
  type Options,
} from "../src/Invoker"

class TestInvoker extends Invoker {
  public sendImpl: (
    msg: InvokeReqMsg,
    req: InvokeReq
  ) => PromiseLike<void | { res?: any }> = async () => {}

  constructor(options?: Options) {
    super("test", options)
  }

  public send(msg: InvokeReqMsg, req: InvokeReq) {
    return this.sendImpl(msg, req)
  }

  public async sendRes(_res: InvokeRes, _sender: any) {}

  public get pendingResponses() {
    return (this as any).responsePromises.size as number
  }
}

describe("Invoker.invoke", () => {
  it("registers the response before sending", async () => {
    const invoker = new TestInvoker()
    invoker.sendImpl = (message) => {
      invoker.handleResMsg({
        key: message._key,
        success: true,
        value: "fast response",
        name: invoker.name,
      })
      return Promise.resolve()
    }

    await expect(invoker.invoke({ func: "fast" })).resolves.toBe(
      "fast response"
    )
    expect(invoker.pendingResponses).toBe(0)
  })

  it("uses a direct receipt to resolve the registered response", async () => {
    const invoker = new TestInvoker({ perferReceiptResponse: true })
    invoker.sendImpl = (message) =>
      Promise.resolve({
        res: {
          key: message._key,
          success: true,
          value: "receipt response",
          name: invoker.name,
        },
      })

    await expect(invoker.invoke({ func: "receipt" })).resolves.toBe(
      "receipt response"
    )
    expect(invoker.pendingResponses).toBe(0)
  })

  it("rejects and cleans up when sending fails", async () => {
    const invoker = new TestInvoker()
    const error = new Error("send failed")
    invoker.sendImpl = () => Promise.reject(error)

    await expect(invoker.invoke({ func: "failure" })).rejects.toBe(error)
    expect(invoker.pendingResponses).toBe(0)
  })
})
