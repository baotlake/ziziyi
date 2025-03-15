import { debounce, type DebouncedFunc } from "lodash-es"
import UAParser from "ua-parser-js"

const DEFAULT_DEBOUNCE_TIME = 1000 * 3

export type EventParams = {
  /**
   * In order for user activity to display in reports like Realtime,
   * engagement_time_msec and session_id must be supplied as part of the params for an event.
   */
  engagement_time_msec?: string
  session_id?: string
  [key: string]: any
}

export type MPEvent = {
  name: string
  /** Events can have a maximum of 25 parameters. */
  params?: EventParams
  timestamp_micros?: number
}

export type PayloadData = {
  client_id: string
  user_id?: string
  /** Requests can have a maximum of 25 events. */
  events: MPEvent[]
  timestamp_micros?: number
  consent?: {
    ad_user_data?: string
    ad_personalization?: string
  }
  /**
   * User properties describe segments of your user base, such as language preference or geographic location.
   * - User property names must be 24 characters or fewer.
   * - User property values must be 36 characters or fewer.
   */
  user_properties?: {}
  /** The user_id parameter must be present whenever user_data is provided. */
  user_data?: {}
}

export type MPConfig = {
  debug?: boolean
  measurement_id: string
  api_secret: string
}

export async function collect(config: MPConfig, payload: PayloadData) {
  const { measurement_id, api_secret, debug } = config
  const basePath = debug ? "/debug" : ""
  const url = `https://www.google-analytics.com${basePath}/mp/collect?measurement_id=${measurement_id}&api_secret=${api_secret}`
  await fetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
    keepalive: true,
  })
}

type Properties = {
  client_id?: string
  user_id?: string
  session_id?: string
}

type Options = MPConfig & {
  debounce?: number
  onFlush?: (properties: Properties) => PromiseLike<void>
}

export type MPTrackEvent = MPEvent & {
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

      await collect(this.options, {
        client_id,
        user_id,
        events,
      })
    }
  }
}
