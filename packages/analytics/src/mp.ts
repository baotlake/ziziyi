import { debounce, type DebouncedFunc } from "lodash-es"
import UAParser from "ua-parser-js"
import type { MPEvent, PayloadData } from "./types"

const DEFAULT_DEBOUNCE_TIME = 1000 * 3

export type MPConfig = {
  debug?: boolean
  measurement_id: string
  api_secret: string
  /** If you want your data to be processed in the EU */
  eu?: boolean
}

export async function collect(config: MPConfig, payload: PayloadData) {
  const { measurement_id, api_secret, debug } = config
  const origin = config.eu
    ? "https://region1.google-analytics.com"
    : "https://www.google-analytics.com"
  const basePath = debug ? "/debug" : ""
  const url = `${origin}${basePath}/mp/collect?measurement_id=${measurement_id}&api_secret=${api_secret}`

  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
    keepalive: true,
  })
  if (res.ok) {
    return res.json()
  }
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
  private uaCache: Map<string | true, UAParser.IResult> = new Map()

  constructor(options: Options) {
    this.options = options
    this.track = this.track.bind(this)
    this.flush = this.flush.bind(this)
    this.debouncedFlush = debounce(
      this.flush,
      this.options.debounce ?? DEFAULT_DEBOUNCE_TIME
    )
    if (options.ua) {
      this.properties.user_agent =
        typeof options.ua == "string" ? options.ua : navigator.userAgent
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
      let result = this.uaCache.get(event.parse_ua)

      if (!result) {
        const ua =
          typeof event.parse_ua === "string"
            ? event.parse_ua
            : navigator.userAgent

        result = UAParser(ua)
        this.uaCache.set(event.parse_ua, result)
      }
      const { os, browser, device } = result
      event.params = {
        ua_os: os.name,
        ua_browser: browser.name,
        ua_device: device.model,
        ...event.params,
      }
      delete event.parse_ua
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
