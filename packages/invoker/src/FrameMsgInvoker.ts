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
    const win =
      this.peer instanceof HTMLElement ? this.peer.contentWindow : this.peer

    if (!win) {
      console.warn("WebviewInvoke: frame not ready", this.peer)
    }

    win?.postMessage({ type: this.invokeMsgType, ...msg }, this.peerOrigin)
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
      chrome.runtime.getURL("")
    )
  }

  public listen() {
    const onMessage = (event: MessageEvent) => {
      // if (event.source !== this.peer) {
      //   return
      // }
      console.log("onMessage: ", event.data)
      const { type, ...message } = event.data
      switch (type) {
        case this.invokeMsgType:
          this.handleReqMsg(message, event.source)
          break
        case this.resMsgType:
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
