export type FuncName = string | number

export interface InvokeReq<T = any[]> {
  func: FuncName
  args?: T
  reply?: boolean
  timeout?: number
  signal?: AbortSignal
  name?: string
  [key: string]: any
}

export interface InvokeReqMsg<T = any[]> extends InvokeReq {
  _key: string | number
  _id: string
}

export interface InvokeRes {
  key: string | number
  func?: FuncName
  success: boolean
  value: any
  name: string
}

interface IInvoker {
  readonly name: string
  readonly IGNORE: Symbol
  add(func: FuncName, service: Function): this
  remove(func: string): this
  invoke<T = any>(req: InvokeReq): Promise<T | null>
  waitInvoke<T extends any[]>({
    func,
    timeout,
  }: {
    func: FuncName
    timeout?: number
  }): Promise<{ args: T }>
}

export abstract class Invoker<Req extends InvokeReq = InvokeReq>
  implements IInvoker
{
  public readonly name: string
  protected readonly uniqueId: string
  private count: number
  private services: Map<FuncName, Function>
  private responsePromises: Map<FuncName, PromiseWithResolvers<any>>
  private waitingPromises: Map<FuncName, PromiseWithResolvers<any>>
  private pendingInvokers: number
  public readonly IGNORE = Symbol("INVOKE_IGNORE")
  public currentSender: any = null

  constructor(name: string) {
    this.name = name
    this.uniqueId = name + Math.round(Math.random() * 1e6)
    this.count = 0
    this.responsePromises = new Map()
    this.services = new Map()
    this.waitingPromises = new Map()
    this.pendingInvokers = 0
  }

  protected get key() {
    return `${this.name}-${this.uniqueId}-${this.count++}`
  }

  public get pendingReqs() {
    return this.pendingInvokers
  }

  public abstract send(
    msg: InvokeReqMsg,
    req: InvokeReq
  ): PromiseLike<void | { res?: any }>
  public abstract sendRes(res: InvokeRes, sender: any): PromiseLike<void>

  public async invoke<T = any>(req: Req): Promise<T> {
    const key = req.key || this.key
    const receipt = await this.send(
      {
        func: req.func,
        args: req.args,
        reply: req.reply,
        _key: key,
        _id: this.uniqueId,
      },
      req
    )
    return this.getReturnValue<T>(key, req, receipt)
  }

  public add(func: FuncName, service: Function) {
    this.services.set(func, service)
    return this
  }

  public remove(func: FuncName) {
    this.services.delete(func)
    return this
  }

  public waitInvoke<T extends any[]>({
    func,
    timeout,
  }: {
    func: FuncName
    timeout?: number
  }): Promise<{ args: T }> {
    const p = this.waitingPromises.get(func) || Promise.withResolvers()
    this.waitingPromises.set(func, p)

    let timer: number
    if (timeout && timeout > 0) {
      timer = window.setTimeout(
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

  protected async getReturnValue<T = any>(
    key: string | number,
    req: InvokeReq,
    receipt?: { res?: any } | void
  ): Promise<T> {
    if (receipt && receipt.res) {
      return receipt.res as T
    }

    const { func, timeout, signal, reply } = req
    if (reply == false) {
      return null as T
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
      timer = window.setTimeout(
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

  protected setReturnValue(key: string | number, success: boolean, value: any) {
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

  public async handleReqMsg(req: Req, sender?: any) {
    this.pendingInvokers++
    try {
      const { func, args, reply, name, _key, _id } = req
      if (_id == this.uniqueId) {
        return
      }
      if (name && name != this.name) {
        return
      }

      this.currentSender = sender
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
        key: _key!,
        success: !error,
        value: !error ? result : error,
        func,
        name: this.name,
      }

      if (sender && reply != false) {
        await this.sendRes(res, sender)
      }
      return res
    } finally {
      this.pendingInvokers--
    }
  }
}

export default Invoker
