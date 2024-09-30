import {
  Invoker,
  type InvokeReq,
  type InvokeRes,
  type InvokeReqMessage,
} from "./Invoker"

const defaultOptions = {
  eventType: "",
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

  public async send(req: InvokeReqMessage & { key: string }) {
    const event = new CustomEvent(this.eventType, {
      detail: {
        type: this.invokeMsgType,
        message: req,
      },
    })
    document.dispatchEvent(event)
    return { key: req.key }
  }

  public sendRes(res: InvokeRes, sender: any) {
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
      }
    }

    document.addEventListener(this.eventType, onMessage)

    return () => {
      document.removeEventListener(this.eventType, onMessage)
    }
  }
}

export { EventInvoker }
