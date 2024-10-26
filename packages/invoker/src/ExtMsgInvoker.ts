import Invoker, {
  type InvokeReqMsg,
  type InvokeReq,
  type InvokeRes,
} from "./Invoker"

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

  constructor(name: string, options = defaultOptions) {
    super(name)
    this.invokeMsgType = options.invokeMsgType
    this.resMsgType = options.resMsgType
  }

  public async send(msg: InvokeReqMsg, req: ExtInvokerReq) {
    if (req.tabId) {
      chrome.tabs.sendMessage(req.tabId, {
        type: this.invokeMsgType,
        tabId: req.tabId,
        ...msg,
      })
    } else {
      chrome.runtime.sendMessage({
        type: this.invokeMsgType,
        tabId: req.tabId,
        ...msg,
      })
    }
  }

  public async sendRes(res: InvokeRes, sender: chrome.runtime.MessageSender) {
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
          self.handleReqMsg(message, sender)
          break
        case self.resMsgType:
          self.handleResMsg(message)
          break
      }
    }
    chrome.runtime.onMessage.addListener(onMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(onMessage)
    }
  }
}

export { ExtMsgInvoker }
