# @ziziyi/analytics

## Install

```bash
npm install @ziziyi/analytics
```

## Usage

```ts
import { MP } from "@ziziyi/analytics"

const mp = new MP({
  measurement_id: "G-XXXXXXXXXX",
  api_secret: "XXXXXXXXXX",
  debounce: 1000,
})

async function track(event, params) {
  if (!mp.isInitialized) {
    // implement your own getSessionData function
    const { clientId, sessionId } = await getSessionData()
    mp.set({
      client_id: clientId,
      session_id: sessionId,
    })
  }

  mp.track({
    name: event,
    params: params,
  })
}
```
