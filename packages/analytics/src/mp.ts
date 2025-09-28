import { debounce, type DebouncedFunc } from "lodash-es"
import UAParser from "ua-parser-js"
import type { MPEvent, PayloadData } from "./types"

export type MPConfig = {
  debug?: boolean
  measurement_id: string
  api_secret: string
  /** If you want your data to be processed in the EU */
  eu?: boolean
  api_base?: string
}

const DEFAULT_DEBOUNCE_TIME = 1000 * 3
const DEFAULT_ORIGIN = "https://www.google-analytics.com"
const EU_ORIGIN = "https://region1.google-analytics.com"

export async function collect(config: MPConfig, payload: PayloadData) {
  const { measurement_id, api_secret, debug, api_base, eu } = config
  let apiBase = `${eu ? EU_ORIGIN : DEFAULT_ORIGIN}${debug ? "/debug" : ""}`
  apiBase = api_base || apiBase

  const url = `${apiBase}/mp/collect?measurement_id=${measurement_id}&api_secret=${api_secret}`

  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
    keepalive: true,
  })
  if (debug && res.status == 200) {
    return res.json()
  }
  return null
}

type Properties = Partial<Omit<PayloadData, "events">> & {
  session_id?: string
}

type Options = MPConfig & {
  debounce?: number
  onFlush?: (properties: Properties) => PromiseLike<void>
  ua?: string | boolean
}

export type MPTrackEvent = MPEvent & {
  /** @deprecated  */
  parse_ua?: boolean | string
}

export class MP {
  private options: Options
  private properties: Properties = {}
  private events: MPEvent[] = []
  private debouncedFlush: DebouncedFunc<() => Promise<void>>
  private eventParams: Record<string, unknown> = {}

  constructor(options: Options) {
    this.options = options
    this.track = this.track.bind(this)
    this.flush = this.flush.bind(this)
    this.debouncedFlush = debounce(
      this.flush,
      this.options.debounce ?? DEFAULT_DEBOUNCE_TIME
    )
    if (options.ua) {
      const userAgent =
        typeof options.ua == "string" ? options.ua : navigator.userAgent
      this.properties.user_agent = userAgent
      const { os, browser, device } = UAParser(userAgent)
      const brands = navigator.userAgentData?.brands || []
      const uaBrand = brands.map((b) => b.brand + "/" + b.version).join(", ")

      this.eventParams = {
        ua_os: os.name,
        ua_browser: browser.name,
        ua_device: device.model,
        ua_brand: uaBrand,
      }
    }
  }

  public set(property: Properties) {
    this.properties = { ...this.properties, ...property }
    this.debouncedFlush()
  }

  public get isInitialized() {
    const { client_id, user_id } = this.properties
    return !!client_id && !!user_id
  }

  /**
   * Track an event
   */
  public track(event: MPTrackEvent) {
    if (!event.timestamp_micros) {
      event.timestamp_micros = Date.now() * 1000
    }
    if (event.parse_ua) {
      delete event.parse_ua
    }

    if (this.eventParams) {
      event.params = {
        ...this.eventParams,
        ...event.params,
      }
    }

    this.events.push(event)
    this.debouncedFlush()
  }

  public async flush() {
    if (this.events.length === 0) {
      return
    }

    try {
      await this.options.onFlush?.(this.properties)
    } catch (e) {
      console.error(e)
    }

    const { client_id, user_id, session_id } = this.properties
    if (!client_id) {
      console.warn("No client_id found")
      return
    }

    while (this.events.length > 0) {
      const events = this.events.splice(0, 25).map((event) => {
        if (event.params && !event.params.session_id) {
          event.params.session_id = session_id
        }
        return event
      })

      const properties = { ...this.properties, session_id: undefined }
      const res = await collect(this.options, {
        ...properties,
        client_id,
        user_id,
        events,
      })

      if (this.options.debug && res?.validationMessages?.length > 0) {
        console.warn("GA validation messages", res.validationMessages)
      }
    }
  }
}
