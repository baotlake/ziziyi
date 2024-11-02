import {
  Invoker,
  type InvokeReq,
  type InvokeRes,
  type InvokeReqMsg,
} from "./Invoker"

const defaultOptions = {
  eventType: "ziziyi-invoke",
  invokeMsgType: "invoke-request",
  resMsgType: "invoke-response",
}

class EventInvoker extends Invoker {
  public readonly eventType: string
  public readonly invokeMsgType: string
  public readonly resMsgType: string

  constructor(name: string, options = defaultOptions) {
    super(name)
    this.eventType = options.eventType || name
    this.invokeMsgType = options.invokeMsgType
    this.resMsgType = options.resMsgType
  }

  public async send(msg: InvokeReqMsg, req: InvokeReq) {
    const event = new CustomEvent(this.eventType, {
      detail: {
        type: this.invokeMsgType,
        message: msg,
      },
    })
    document.dispatchEvent(event)
  }

  public async sendRes(res: InvokeRes, sender?: any) {
    const event = new CustomEvent(this.eventType, {
      detail: {
        type: this.resMsgType,
        message: res,
      },
    })
    document.dispatchEvent(event)
  }

  public listen() {
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

    document.addEventListener(this.eventType, onMessage)

    return () => {
      document.removeEventListener(this.eventType, onMessage)
    }
  }
}

export { EventInvoker }
