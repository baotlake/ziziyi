import Invoker, {
  type InvokeReqMessage,
  type InvokeReq,
  type InvokeRes,
} from "./Invoker"

const defaultOptions = {
  invokeMsgType: "invoke-request",
  resMsgType: "invoke-response",
}

class ExtMsgInvoker extends Invoker {
  public readonly invokeMsgType: string
  public readonly resMsgType: string

  constructor(name: string, options = defaultOptions) {
    super(name)
    this.invokeMsgType = options.invokeMsgType
    this.resMsgType = options.resMsgType
  }

  public async send(req: InvokeReqMessage & { key: string }) {
    if (req.tabId) {
      chrome.tabs.sendMessage(req.tabId, {
        type: this.invokeMsgType,
        ...req,
      })
    } else {
      chrome.runtime.sendMessage({
        type: this.invokeMsgType,
        ...req,
      })
    }

    return { key: req.key }
  }

  public sendRes(res: InvokeRes, sender: chrome.runtime.MessageSender) {
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
