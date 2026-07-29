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
  public currentSender: chrome.runtime.MessageSender | null = null

  constructor(name: string, options: ExtMsgOptions = defaultOptions) {
    super(name, options)
    this.invokeMsgType = options.invokeMsgType || defaultOptions.invokeMsgType
    this.resMsgType = options.resMsgType || defaultOptions.resMsgType
  }

  public async send(msg: InvokeReqMsg, req: ExtInvokerReq) {
    let res: unknown = null
    if (req.tabId) {
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
    if (this.perferReceiptResponse && ctx?.sendResponse) {
      try {
        ctx.sendResponse(res)
        return
      } catch (err) {
        console.warn("ctx.sendResponse error", err)
      }
    }

    if (!sender) {
      return
    }

    if (chrome.tabs && sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: this.resMsgType,
        ...res,
      })
    } else {
      chrome.runtime.sendMessage({
        type: this.resMsgType,
        ...res,
      })
    }
  }

  public listen() {
    const self = this
    const onMessage = (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      switch (message.type) {
        case self.invokeMsgType:
          self.handleReqMsg(message, sender, { sender, sendResponse })
          break
        case self.resMsgType:
          self.handleResMsg(message)
          break
      }
      if (this.perferReceiptResponse) {
        return true
      }
    }
    chrome.runtime.onMessage.addListener(onMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(onMessage)
    }
  }
}

export { ExtMsgInvoker }
