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

export interface InvokeCtx {
  sender?: any
  [key: string]: any
}

export interface Options {
  perferReceiptResponse?: boolean
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
  protected readonly perferReceiptResponse: boolean = false

  constructor(
    name: string,
    options: Options = { perferReceiptResponse: false }
  ) {
    this.name = name
    this.uniqueId = name + Math.round(Math.random() * 1e6)
    this.count = 0
    this.responsePromises = new Map()
    this.services = new Map()
    this.waitingPromises = new Map()
    this.pendingInvokers = 0
    this.perferReceiptResponse = options.perferReceiptResponse || false
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
  public abstract sendRes(
    res: InvokeRes,
    sender: any,
    ctx?: InvokeCtx
  ): PromiseLike<void>

  public async invoke<T = any>(req: Req): Promise<T> {
    const key = req.key || this.key
    const response =
      req.reply == false
        ? undefined
        : this.responsePromises.get(key) || Promise.withResolvers()

    if (response) {
      this.responsePromises.set(key, response)
      // A fast error response may arrive before this promise is returned.
      void response.promise.catch(() => {})
    }

    try {
      const receipt = await this.send(
        {
          func: req.func,
          args: req.args,
          reply: req.reply,
          name: req.name,
          _key: key,
          _id: this.uniqueId,
        },
        req
      )
      return await this.getReturnValue<T>(key, req, receipt)
    } finally {
      if (response && this.responsePromises.get(key) === response) {
        this.responsePromises.delete(key)
      }
    }
  }

  /** Whether this context owns a service; waitInvoke() is observation only. */
  protected canHandleRequest(req: Req): boolean {
    return (
      !!req &&
      typeof req === "object" &&
      req._id !== this.uniqueId &&
      (!req.name || req.name === this.name) &&
      this.services.has(req.func)
    )
  }

  protected reportError(error: unknown) {
    console.error("invoke error: ", error)
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
      timer = setTimeout(
        () => p.reject(`wait invoke "${this.name}" timeout: ${func}`),
        timeout
      ) as never as number
    }

    const cleanup = () => {
      this.waitingPromises.delete(func)
      timer && clearTimeout(timer)
    }
    void p.promise.then(cleanup, cleanup)

    return p.promise
  }

  protected async getReturnValue<T = any>(
    key: string | number,
    req: InvokeReq,
    receipt?: { res?: any } | void
  ): Promise<T> {
    // console.log("getReturnValue: ", key, req, receipt)

    const { func, timeout, signal, reply } = req
    if (reply == false) {
      return null as T
    }

    if (receipt && receipt.res) {
      if (!this.perferReceiptResponse) {
        // conpatibility with old version
        return receipt.res as T
      }

      const res = receipt.res as InvokeRes
      if (
        typeof receipt.res === "object" &&
        res.key == key &&
        typeof res.success == "boolean"
      ) {
        return res.success != false ? res.value : Promise.reject(res.value)
      }
    }

    const p = this.responsePromises.get(key) || Promise.withResolvers()
    this.responsePromises.set(key, p)

    const abort = (e: Event) => p.reject(`invoke aborted: ${signal?.reason}`)
    if (signal) {
      signal.addEventListener("abort", abort)
    }

    let timer: number
    if (timeout && timeout > 0) {
      timer = setTimeout(
        () => p.reject(`"${this.name}" invoke timeout: ${func} key: ${key}`),
        timeout ?? 20000
      ) as unknown as number
    }

    p.promise
      .finally(() => {
        timer && clearTimeout(timer)
        signal?.removeEventListener("abort", abort)
      })
      .catch(() => {})

    return p.promise
  }

  public handleResMsg(message: InvokeRes) {
    const { key, success, value } = message

    if (key == null || typeof success !== "boolean") return

    const p = this.responsePromises.get(key)
    if (p) {
      const fn = success != false ? p.resolve : p.reject
      fn(value)
    }
    // Broadcast responses and late responses need not belong to this instance.
  }

  public async handleReqMsg(req: Req, sender?: any, ctx?: InvokeCtx) {
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
      let error: unknown
      let failed = false

      try {
        const waiting = this.waitingPromises.get(func)
        if (waiting) {
          waiting.resolve(args)
        }

        const service = this.services.get(func)
        if (service) {
          result = await service(...(args || []))
        } else {
          // A waiter observes the call but must not answer for its service.
          return null
        }
      } catch (err) {
        failed = true
        error = err
      }

      if (result == this.IGNORE) {
        return
      }

      const res: InvokeRes = {
        key: _key!,
        success: !failed,
        value: failed ? error : result,
        func,
        name: this.name,
      }

      if (reply != false) {
        await this.sendRes(res, sender, ctx)
      } else if (failed) {
        this.reportError(error)
      }
      return res
    } finally {
      this.pendingInvokers--
    }
  }
}

export default Invoker
