import Invoker, {
  type InvokeReqMsg,
  type InvokeReq,
  type InvokeRes,
} from "./Invoker"

type Options = {
  win?: Window | (() => Window)
  peer: HTMLIFrameElement | Window | (() => HTMLIFrameElement | Window)
  peerOrigin?: string
  invokeMsgType?: string
  resMsgType?: string
}

class WindowMsgInvoker extends Invoker {
  public readonly peer: Options["peer"]
  public readonly win: Options["win"]
  public peerOrigin: string
  public readonly invokeMsgType: string
  public readonly resMsgType: string
  private _unlisten?: () => void

  constructor(name: string, options: Options) {
    super(name)
    const { peer, peerOrigin, invokeMsgType, resMsgType, win } = {
      peerOrigin: "*",
      invokeMsgType: `invoke-request`,
      resMsgType: `invoke-response`,
      ...options,
    }
    this.peer = peer
    this.peerOrigin = peerOrigin
    this.invokeMsgType = invokeMsgType
    this.resMsgType = resMsgType
    this.win = win
  }

  public async send(msg: InvokeReqMsg, req: InvokeReq) {
    if (!this.peer) {
      throw new Error("Peer is not set")
    }
    try {
      const peer = typeof this.peer == "function" ? this.peer() : this.peer
      const win = "postMessage" in peer ? peer : peer.contentWindow!
      win.postMessage({ type: this.invokeMsgType, ...msg }, this.peerOrigin)
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
    if (this._unlisten) {
      this._unlisten()
    }
    const win = typeof this.win === "function" ? this.win() : this.win || window

    const onMessage = (event: MessageEvent) => {
      // if (event.source !== this.peer) {
      //   return
      // }
      if (!event.data || typeof event.data !== "object") {
        return
      }
      console.log("onMessage: ", this.name, event.data)
      const { type, ...message } = event.data
      switch (type) {
        case this.invokeMsgType:
          // event.stopImmediatePropagation()
          this.handleReqMsg(message, event.source)
          break
        case this.resMsgType:
          // event.stopImmediatePropagation()
          this.handleResMsg(message)
          break
      }
    }
    win.addEventListener("message", onMessage)
    this._unlisten = () => {
      win.removeEventListener("message", onMessage)
      this._unlisten = undefined
    }
    return this._unlisten
  }

  public unlisten() {
    this._unlisten?.()
  }
}

export { WindowMsgInvoker }
