import { MP, collect } from "../src/mp"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("collect", () => {
  beforeEach(() => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should call the production endpoint by default", async () => {
    await collect(
      { measurement_id: "test_id", api_secret: "test_secret" },
      { client_id: "test_client", events: [] }
    )
    expect(fetch).toHaveBeenCalledWith(
      "https://www.google-analytics.com/mp/collect?measurement_id=test_id&api_secret=test_secret",
      expect.any(Object)
    )
  })

  it("should call the debug endpoint when debug is true", async () => {
    await collect(
      {
        measurement_id: "test_id",
        api_secret: "test_secret",
        debug: true,
      },
      { client_id: "test_client", events: [] }
    )
    expect(fetch).toHaveBeenCalledWith(
      "https://www.google-analytics.com/debug/mp/collect?measurement_id=test_id&api_secret=test_secret",
      expect.any(Object)
    )
  })

  it("should call the custom api_base endpoint when provided", async () => {
    await collect(
      {
        measurement_id: "test_id",
        api_secret: "test_secret",
        api_base: "https://region1.google-analytics.com/debug",
      },
      { client_id: "test_client", events: [] }
    )
    expect(fetch).toHaveBeenCalledWith(
      "https://region1.google-analytics.com/debug/mp/collect?measurement_id=test_id&api_secret=test_secret",
      expect.any(Object)
    )
  })

  it("should return the json response", async () => {
    const mockResponse = { message: "Success" }
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )
    const result = await collect(
      { measurement_id: "test_id", api_secret: "test_secret" },
      { client_id: "test_client", events: [] }
    )
    expect(result).toEqual(mockResponse)
  })
})

describe("MP", () => {
  beforeEach(() => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    )
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should warn if client_id is not set on flush", async () => {
    const mp = new MP({
      measurement_id: "test_id",
      api_secret: "test_secret",
      debug: true,
    })
    mp.track({ name: "test_event" })
    await mp.flush()
    expect(console.warn).toHaveBeenCalledWith("No client_id found")
  })

  it("should not call collect if no events are tracked", async () => {
    const mp = new MP({
      measurement_id: "test_id",
      api_secret: "test_secret",
      debug: true,
    })
    mp.set({ client_id: "test_client" })
    await mp.flush()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("should call collect with the correct payload on flush and receive no validation messages", async () => {
    const mp = new MP({
      measurement_id: "test_id",
      api_secret: "test_secret",
      debug: true,
    })
    mp.set({ client_id: "test_client", user_id: "test_user" })
    mp.track({ name: "test_event" })
    await mp.flush()

    expect(fetch).toHaveBeenCalledTimes(1)
    const fetchBody = JSON.parse((fetch as any).mock.calls[0][1].body as string)

    expect(fetchBody).toEqual({
      client_id: "test_client",
      user_id: "test_user",
      events: [
        {
          name: "test_event",
          timestamp_micros: expect.any(Number),
          params: expect.objectContaining({}),
        },
      ],
    })

    // A valid request in debug mode should not produce any validation messages.
    expect(console.warn).not.toHaveBeenCalledWith(
      "GA validation messages",
      expect.any(Array)
    )
  })

  it("should log validation messages in debug mode for invalid requests", async () => {
    const validationMessages = [{ description: "Invalid parameter" }]
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ validationMessages }), { status: 200 })
    )
    const mp = new MP({
      measurement_id: "test_id",
      api_secret: "test_secret",
      debug: true,
    })
    mp.set({ client_id: "test_client" })
    mp.track({ name: "test_event" })
    await mp.flush()
    expect(console.warn).toHaveBeenCalledWith(
      "GA validation messages",
      validationMessages
    )
  })
})
