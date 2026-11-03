/// <reference types="chrome" />

import Invoker, {
  type InvokeReqMsg,
  type InvokeReq,
  type InvokeRes,
  type InvokeCtx,
  type Options,
} from "./Invoker"

interface ExtMsgInvokeCtx extends InvokeCtx {
  sendResponse?: (response?: any) => void
}

interface ExtMsgOptions extends Options {
  invokeMsgType?: string
  resMsgType?: string
  /** Receives notification execution errors and detached response delivery errors. */
  onError?: (error: unknown) => void
}

const defaultOptions = {
  invokeMsgType: "invoke-request",
  resMsgType: "invoke-response",
}

interface ExtInvokerReq extends InvokeReq {
  tabId?: number
}

class ExtMsgInvoker extends Invoker<ExtInvokerReq> {
  public readonly invokeMsgType: string
  public readonly resMsgType: string
  private unlisten?: () => void
  private readonly onError?: ExtMsgOptions["onError"]
  public currentSender: chrome.runtime.MessageSender | null = null

  constructor(name: string, options: ExtMsgOptions = defaultOptions) {
    super(name, options)
    this.onError = options.onError
    this.invokeMsgType = options.invokeMsgType || defaultOptions.invokeMsgType
    this.resMsgType = options.resMsgType || defaultOptions.resMsgType
  }

  public async send(msg: InvokeReqMsg, req: ExtInvokerReq) {
    let res: unknown = null
    if (req.tabId != null) {
      res = await chrome.tabs.sendMessage(req.tabId, {
        type: this.invokeMsgType,
        tabId: req.tabId,
        ...msg,
      })
    } else {
      res = await chrome.runtime.sendMessage({
        type: this.invokeMsgType,
        tabId: req.tabId,
        ...msg,
      })
    }
    return { res }
  }

  public async sendRes(
    res: InvokeRes,
    sender: chrome.runtime.MessageSender,
    ctx?: ExtMsgInvokeCtx
  ) {
    // Chrome uses JSON serialization. Keep normalization at this transport boundary.
    const response =
      !res.success && res.value instanceof Error
        ? {
            ...res,
            value: {
              ...res.value,
              name: res.value.name,
              message: res.value.message,
            },
          }
        : res
    if (this.perferReceiptResponse && ctx?.sendResponse) {
      ctx.sendResponse(response)
      return
    }

    if (!sender) {
      return
    }

    if (chrome.tabs && sender.tab?.id != null) {
      await chrome.tabs.sendMessage(sender.tab.id, {
        type: this.resMsgType,
        ...response,
      })
    } else {
      await chrome.runtime.sendMessage({
        type: this.resMsgType,
        ...response,
      })
    }
  }

  /** Shared by listen() and background scripts with a custom message router. */
  public handleMessage = (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): true | undefined => {
    if (!message || typeof message !== "object") return
    if (message.type === this.resMsgType) {
      this.handleResMsg(message)
      return
    }
    if (message.type !== this.invokeMsgType) return

    const keepAlive =
      this.perferReceiptResponse &&
      message.reply !== false &&
      this.canHandleRequest(message)
    let responded = false
    const respond = (response?: any) => {
      sendResponse(response)
      responded = true
    }
    // Dispatch even without a service so waitInvoke() observers are notified.
    void this.handleReqMsg(message, sender, {
      sender,
      sendResponse: respond,
    }).catch((error) => {
      if (keepAlive && !responded) {
        // A serialization failure must not leave an owned RPC unanswered.
        try {
          respond({
            key: message._key,
            func: message.func,
            name: this.name,
            success: false,
            value: { name: "Error", message: String(error) },
          })
          return
        } catch (deliveryError) {
          this.reportError(deliveryError)
          return
        }
      }
      this.reportError(error)
    })
    // IGNORE deliberately sends nothing, allowing another service to respond.
    return keepAlive ? true : undefined
  }

  protected reportError(error: unknown) {
    // Event handlers have no caller to await their delivery failure.
    try {
      void Promise.resolve(this.onError?.(error)).catch(() => {})
    } catch {}
  }

  public listen() {
    this.unlisten?.()
    const listener = this.handleMessage
    chrome.runtime.onMessage.addListener(listener)
    const unlisten = () => {
      if (this.unlisten !== unlisten) return
      chrome.runtime.onMessage.removeListener(listener)
      this.unlisten = undefined
    }
    this.unlisten = unlisten
    return unlisten
  }
}

export { ExtMsgInvoker }
