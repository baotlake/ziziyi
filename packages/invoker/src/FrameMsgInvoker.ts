import Invoker, {
  type InvokeReqMsg,
  type InvokeReq,
  type InvokeRes,
} from "./Invoker"

type Options = {
  peer: HTMLIFrameElement | Window
  peerOrigin?: string
  invokeMsgType?: string
  resMsgType?: string
}

const defaultOptions = {
  peerOrigin: "*",
  invokeMsgType: "invoke-request",
  resMsgType: "invoke-response",
}

class FrameMsgInvoker extends Invoker {
  public readonly peer: HTMLIFrameElement | Window | null
  public peerOrigin: string
  public readonly invokeMsgType: string
  public readonly resMsgType: string

  constructor(name: string, options: Options) {
    super(name)
    const { peer, peerOrigin, invokeMsgType, resMsgType } = {
      ...defaultOptions,
      ...options,
    }
    this.peer = peer
    this.peerOrigin = peerOrigin
    this.invokeMsgType = invokeMsgType
    this.resMsgType = resMsgType
  }

  public async send(msg: InvokeReqMsg, req: InvokeReq) {
    if (!this.peer) {
      throw new Error("Peer is not set")
    }

    try {
      const win =
        "postMessage" in this.peer ? this.peer : this.peer.contentWindow
      win?.postMessage({ type: this.invokeMsgType, ...msg }, this.peerOrigin)
    } catch (error) {
      console.warn("WebviewInvoke: frame not ready", this.peer, error)
    }
  }

  public async sendRes(res: InvokeRes, sender: Window) {
    if (!sender) {
      return
    }

    sender.postMessage(
      {
        type: this.resMsgType,
        ...res,
      },
      this.peerOrigin
    )
  }

  public listen() {
    const onMessage = (event: MessageEvent) => {
      // if (event.source !== this.peer) {
      //   return
      // }
      if (!event.data || typeof event.data !== "object") {
        return
      }
      // console.log("onMessage: ", event.data)
      const { type, ...message } = event.data
      switch (type) {
        case this.invokeMsgType:
          event.stopImmediatePropagation()
          this.handleReqMsg(message, event.source)
          break
        case this.resMsgType:
          event.stopImmediatePropagation()
          this.handleResMsg(message)
          break
      }
    }
    window.addEventListener("message", onMessage)
    return () => {
      window.removeEventListener("message", onMessage)
    }
  }
}

export { FrameMsgInvoker }
