import Invoker, { type InvokeReqMessage, type InvokeRes } from "./Invoker"

const defaultOptions = {
  invokeMsgType: "invoke-request",
  resMsgType: "invoke-response",
}

class ExtConnectInvoker extends Invoker {
  public readonly invokeMsgType: string
  public readonly resMsgType: string
  public port: chrome.runtime.Port | null = null

  constructor(name: string, options = defaultOptions) {
    super(name)
    this.invokeMsgType = options.invokeMsgType
    this.resMsgType = options.resMsgType
  }

  public async send(req: InvokeReqMessage & { key: string }) {
    if (!this.port) {
      throw new Error("Port is not connected")
    }

    this.port.postMessage({ type: this.invokeMsgType, ...req })
    return { key: req.key }
  }

  public sendRes(res: InvokeRes, port: chrome.runtime.Port) {
    if (!this.port) {
      return
    }
    this.port.postMessage({ type: this.resMsgType, ...res })
  }

  public listen(onConnect: (port: chrome.runtime.Port) => void) {
    const self = this
    const handleConnect = (port: chrome.runtime.Port) => {
      if (port.name === self.name) {
        self.port = port
        self.port.onDisconnect.addListener(() => {
          self.port = null
        })
        self.port.onMessage.addListener((message) => {
          if (message.type === self.invokeMsgType) {
            self.handleReqMsg(message, self.port)
          } else if (message.type === self.resMsgType) {
            self.handleResMsg(message)
          }
        })
        onConnect(port)
      }
    }

    chrome.runtime.onConnect.addListener(handleConnect)
    return () => {
      chrome.runtime.onConnect.removeListener(handleConnect)
    }
  }

  public connect(tabId?: number) {
    if (tabId) {
      this.port = chrome.tabs.connect(tabId, {
        name: this.name,
      })
    } else {
      this.port = chrome.runtime.connect({
        name: this.name,
      })
    }

    this.port.onDisconnect.addListener(() => {
      this.port = null
    })
    this.port.onMessage.addListener((message) => {
      if (message.type === this.invokeMsgType) {
        this.handleReqMsg(message, this.port)
      } else if (message.type === this.resMsgType) {
        this.handleResMsg(message)
      }
    })
  }
}

export { ExtConnectInvoker }
