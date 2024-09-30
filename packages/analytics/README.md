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

mp.set({
  client_id: "client_id",
  session_id: "session_id",
})

mp.track("event_name", {
  name: "event_name",
  params: {
    key: "value",
  },
})
```
