export type InvokeReqMessage = {
  func: string
  args?: any[]
  key?: string
  reply?: boolean
  tabId?: number
  invoker?: string
}

export type InvokeReq = InvokeReqMessage & {
  timeout?: number
  signal?: AbortSignal
  [key: string]: any
}

export interface InvokeRes {
  key: string
  success: boolean
  value: any
  func?: string
}

interface IInvoker {
  readonly name: string
  readonly IGNORE: Symbol
  add(func: string, service: Function): this
  remove(func: string): this
  invoke<T = any>(req: InvokeReq): Promise<T | null>
  waitInvoke<T extends any[]>({
    func,
    timeout,
  }: {
    func: string
    timeout?: number
  }): Promise<{ args: T }>
}

export abstract class Invoker implements IInvoker {
  public readonly name: string
  protected readonly uniqueId: string
  private count: number
  private services: Map<string, Function>
  private responsePromises: Map<string, PromiseWithResolvers<any>>
  private waitingPromises: Map<string, PromiseWithResolvers<any>>
  public readonly IGNORE = Symbol("INVOKE_IGNORE")

  constructor(name: string) {
    this.name = name
    this.uniqueId = name + Math.round(Math.random() * 1e6)
    this.count = 0
    this.responsePromises = new Map()
    this.services = new Map()
    this.waitingPromises = new Map()
  }

  protected get key() {
    return `${this.name}-${this.uniqueId}-${this.count++}`
  }

  protected async getReturnValue<T = any>(
    key: string,
    req: InvokeReq
  ): Promise<T | null> {
    const { func, timeout, signal, reply } = req
    if (reply == false) {
      return null
    }

    const p = this.responsePromises.get(key) || Promise.withResolvers()
    this.responsePromises.set(key, p)

    if (signal) {
      signal.addEventListener("abort", () =>
        p.reject(`invoke aborted: ${signal.reason}`)
      )
    }

    let timer: number
    if (timeout && timeout > 0) {
      timer = setTimeout(
        () => p.reject(`"${this.name}" invoke timeout: ${func} key: ${key}`),
        timeout ?? 20000
      )
    }

    p.promise.finally(() => {
      this.responsePromises.delete(key)
      timer && clearTimeout(timer)
    })

    return p.promise
  }

  protected setReturnValue(key: string, success: boolean, value: any) {
    const p = this.responsePromises.get(key)
    if (p) {
      const fn = success != false ? p.resolve : p.reject
      fn(value)
    } else {
      console.error(`unknown invoke callback message: ${key}`)
      console.log(this.responsePromises)
    }
  }

  public handleResMsg(message: InvokeRes) {
    const { key, success, value } = message

    if (!key || typeof success !== "boolean") {
      console.error(`invalid invoke response: ${key}`, message)
    }

    this.setReturnValue(key, success, value)
  }

  public async handleReqMsg(message: InvokeReqMessage, sender?: any) {
    const { key, func, args, reply, invoker } = message
    if (invoker == this.uniqueId) {
      return
    }

    let result = null
    let error = null

    try {
      const waiting = this.waitingPromises.get(func)
      if (waiting) {
        waiting.resolve(args)
      }

      const service = this.services.get(func)
      if (service) {
        result = await service(...(args || []))
      } else {
        error = `unknown service: ${func}`
        console.warn(`unknown service: ${func}`)
        return null
      }
    } catch (err) {
      console.error("invoke error: ", err)
      error = err
    }

    if (result == this.IGNORE) {
      return
    }

    const res: InvokeRes = {
      key: key!,
      success: !error,
      value: !error ? result : error,
      func,
    }

    if (sender && reply != false) {
      this.sendRes(res, sender)
    }
    return res
  }

  public async invoke<T = any>(req: InvokeReq): Promise<T | null> {
    const { key } = await this.send({
      func: req.func,
      args: req.args,
      key: req.key || this.key,
      tabId: req.tabId,
      reply: req.reply,
    })
    return this.getReturnValue<T>(key, req)
  }

  public waitInvoke<T extends any[]>({
    func,
    timeout,
  }: {
    func: string
    timeout?: number
  }): Promise<{ args: T }> {
    const p = this.waitingPromises.get(func) || Promise.withResolvers()
    this.waitingPromises.set(func, p)

    let timer: number
    if (timeout && timeout > 0) {
      timer = setTimeout(
        () => p.reject(`wait invoke "${this.name}" timeout: ${func}`),
        timeout
      )
    }

    p.promise.finally(() => {
      this.waitingPromises.delete(func)
      timer && clearTimeout(timer)
    })

    return p.promise
  }

  public add(func: string, service: Function) {
    this.services.set(func, service)
    return this
  }

  public remove(func: string) {
    this.services.delete(func)
    return this
  }

  public abstract send(req: InvokeReq): Promise<{ key: string }>
  public abstract sendRes(res: InvokeRes, sender: any): void
}

export default Invoker
