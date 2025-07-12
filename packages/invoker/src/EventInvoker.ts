import {
  Invoker,
  type InvokeReq,
  type InvokeRes,
  type InvokeReqMsg,
} from "./Invoker"

type Options = {
  target?: EventTarget | (() => EventTarget)
  eventType?: string
  invokeMsgType?: string
  resMsgType?: string
}

const defaultOptions = {
  eventType: "ziziyi-invoke",
  invokeMsgType: "invoke-request",
  resMsgType: "invoke-response",
}

class EventInvoker extends Invoker {
  public readonly target: Options["target"]
  public readonly eventType: string
  public readonly invokeMsgType: string
  public readonly resMsgType: string
  private _unlisten?: () => void

  constructor(name: string, options: Options = {}) {
    super(name)
    const { eventType, invokeMsgType, resMsgType, target } = {
      ...defaultOptions,
      ...options,
    }
    this.eventType = eventType || name
    this.invokeMsgType = invokeMsgType
    this.resMsgType = resMsgType
    this.target = target
  }

  public async send(msg: InvokeReqMsg, req: InvokeReq) {
    const event = new CustomEvent(this.eventType, {
      detail: {
        type: this.invokeMsgType,
        message: msg,
      },
    })
    const target =
      typeof this.target === "function"
        ? this.target()
        : this.target || document

    target.dispatchEvent(event)
  }

  public async sendRes(res: InvokeRes, sender?: any) {
    const event = new CustomEvent(this.eventType, {
      detail: {
        type: this.resMsgType,
        message: res,
      },
    })
    const target =
      typeof this.target === "function"
        ? this.target()
        : this.target || document

    target.dispatchEvent(event)
  }

  public listen() {
    if (this._unlisten) {
      this._unlisten()
    }
    const target =
      typeof this.target === "function"
        ? this.target()
        : this.target || document

    const onMessage = (
      event: Event | CustomEvent<{ type: string; message: any }>
    ) => {
      if ("detail" in event) {
        const { type, message } = event.detail
        switch (type) {
          case this.invokeMsgType:
            this.handleReqMsg(message, event.type)
            break
          case this.resMsgType:
            this.handleResMsg(message)
            break
        }
      }
    }

    target.addEventListener(this.eventType, onMessage)

    this._unlisten = () => {
      target.removeEventListener(this.eventType, onMessage)
      this._unlisten = undefined
    }
    return this._unlisten
  }

  public unlisten() {
    this._unlisten?.()
  }
}

export { EventInvoker }
