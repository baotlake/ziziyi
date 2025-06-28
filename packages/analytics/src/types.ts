export interface Device {
  /**
   * Optional. The category of the device.
   * @example "desktop", "tablet", "mobile", "smart TV"
   */
  category?: string

  /**
   * Optional. The language of the device in ISO 639-1 format.
   * @example "en", "en-US", "zh-CN"
   */
  language?: string

  /**
   * Optional. The resolution of the device screen, formatted as WIDTHxHEIGHT.
   * @example "1920x1080", "2560x1440"
   */
  screen_resolution?: string

  /**
   * Optional. The operating system or platform of the device.
   * @example "macOS", "Windows", "Android", "iOS"
   */
  operating_system?: string

  /**
   * Optional. The version of the operating system or platform.
   * @example "14.5", "11", "15.0"
   */
  operating_system_version?: string

  /**
   * Optional. The model of the device.
   * @example "Pixel 8 Pro", "iPhone 15 Pro", "Samsung Galaxy S24"
   */
  model?: string

  /**
   * Optional. The brand of the device.
   * @example "Google", "Apple", "Samsung"
   */
  brand?: string

  /**
   * Optional. The web browser used on the device.
   * @example "Chrome", "Firefox", "Safari", "Edge"
   */
  browser?: string

  /**
   * Optional. The version of the web browser.
   * @example "126.0.6478.127", "127.0", "17.5"
   */
  browser_version?: string
}

/**
 * Describes the user's geographical location.
 * Provide as many of the attributes as possible. We recommend `country_id` and `region_id` at a minimum.
 */
export interface UserLocation {
  /**
   * Optional. The city's name.
   * If the city is in the US, also set `country_id` and `region_id` so Google Analytics can properly map the city name to a city ID.
   * @example "Mountain View"
   */
  city?: string

  /**
   * Optional. The ISO 3166 country and subdivision code.
   * @example "US-CA", "US-NY", "CA-QC", "GB-LND", "CN-HK"
   */
  region_id?: string

  /**
   * Optional. The country in ISO 3166-1 alpha-2 format.
   * @example "US", "AU", "ES", "FR", "CA"
   */
  country_id?: string

  /**
   * Optional. The subcontinent in UN M49 format.
   * @see https://en.wikipedia.org/wiki/UN_M49
   * @example "011" (Western Africa), "021" (Northern America), "030" (Eastern Asia), "039" (Southern Europe)
   */
  subcontinent_id?: string

  /**
   * Optional. The continent in UN M49 format.
   * @see https://en.wikipedia.org/wiki/UN_M49
   * @example "002" (Africa), "019" (Americas), "142" (Asia), "150" (Europe)
   */
  continent_id?: string
}

export interface UserProperties {
  [key: string]: any
}

export interface UserData {
  [key: string]: any
}

export interface EventParams {
  /**
   * In order for user activity to display in reports like Realtime,
   * engagement_time_msec and session_id must be supplied as part of the params for an event.
   */
  engagement_time_msec?: string
  session_id?: string
  [key: string]: any
}

export interface MPEvent {
  name: string
  /** Events can have a maximum of 25 parameters. */
  params?: EventParams
  timestamp_micros?: number
}

export interface PayloadData {
  /**
   * Required. A unique identifier for a client instance. In a web context, this is typically the Firebase Installation ID or a unique ID stored in a cookie.
   * @see https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?client_type=gtag#send_an_event
   */
  client_id: string

  /**
   * Optional. A unique identifier for a user. This is used for cross-platform and cross-device analysis.
   * Can include only UTF-8 characters.
   * @see https://support.google.com/analytics/answer/9213390
   */
  user_id?: string

  /**
   * Optional. A Unix timestamp in microseconds, not milliseconds. Represents the time the event occurred.
   * This should only be set to record events that happened in the past.
   * Events can be backdated up to 3 calendar days based on the property's timezone.
   */
  timestamp_micros?: number

  /**
   * Optional. The user agent string for the client.
   * Google Analytics will use this to derive device information if the `device` object is not provided.
   */
  user_agent?: string

  /**
   * Optional. The IP address Google Analytics uses to derive geographic information for the request.
   * Recommended for server-side implementations where the user's IP is known.
   */
  ip_override?: string

  /**
   * Optional. Structured information about the user's device.
   */
  device?: Device

  /**
   * Optional. Sets the geographic information for the request in a structured format.
   */
  user_location?: UserLocation

  /**
   * Optional. User properties that describe segments of your user base, such as language preference or geographic location.
   */
  user_properties?: UserProperties

  /**
   * Optional. User-provided data for the user.
   * The `user_id` parameter must be present whenever `user_data` is provided.
   */
  user_data?: UserData

  /**
   * Optional. Consent settings for the request.
   * @see https://developers.google.com/analytics/devguides/collection/protocol/ga4/consent
   */
  consent?: {
    /**
     * Optional. Sets the user's consent for ads user data.
     * Allowed values are "granted" or "denied".
     */
    ad_user_data?: "granted" | "denied"

    /**
     * Optional. Sets the user's consent for ad personalization.
     * Allowed values are "granted" or "denied".
     */
    ad_personalization?: "granted" | "denied"
  }

  /**
   * @deprecated Use the `ad_personalization` field of `consent` instead.
   * Optional. Set to `true` to indicate the user's data shouldn't be used for personalized ads.
   */
  non_personalized_ads?: boolean

  /**
   * Required. An array of event items. A maximum of 25 events can be sent per request.
   */
  events: MPEvent[]
}
