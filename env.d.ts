interface DocumentPictureInPicture extends EventTarget {
  window: Window | null
  requestWindow(option?: { width?: number; height?: number }): Promise<Window>
}

interface FeaturePolicy {
  allowedFeatures: () => string[]
  features: () => string[]
  allowsFeature: (feature: string) => boolean
}

declare namespace chrome.declarativeNetRequest {
  export function getSessionRules(filter: {
    ruleIds: number[]
  }): Promise<chrome.declarativeNetRequest.Rule[]>
}

declare interface ManifestPatch {
  web_accessible_resources: Array<{
    resources: string[]
    matches: string[]
    use_dynamic_url: boolean
  }>
}

type Manifest = chrome.runtime.ManifestV3 & ManifestPatch

declare namespace chrome.cookies {
  interface Cookie {
    partitionKey?: {
      topLevelSite: string
    }
  }

  interface Details {
    partitionKey?: {
      topLevelSite: string
    }
  }

  interface SetDetails {
    partitionKey?: {
      topLevelSite: string
    }
  }

  interface GetAllDetails {
    partitionKey?: {
      topLevelSite: string
    }
  }
}

interface Window {
  documentPictureInPicture?: DocumentPictureInPicture
  trustedTypes: any
}

interface Document {
  featurePolicy?: FeaturePolicy
}

declare var __DEV__: boolean
declare var __content_run_at_: string | undefined

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: "development" | "production"
    BROWSER?: "chrome" | "edge" | "arc" | "firefox"
  }
}

interface PromiseConstructor {
  withResolvers: () => {
    promise: Promise<any>
    resolve: (value: any) => void
    reject: (reason: any) => void
  }
}

interface Navigator {
  userAgentData?: {
    platform: string
  }
}
