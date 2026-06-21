import { useState, useEffect } from "react"

export default function useActiveTab() {
  const [activeTab, setActiveTab] = useState<chrome.tabs.Tab | null>(null)

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.tabs) return

    const handleTabChange = (activeInfo: chrome.tabs.OnActivatedInfo) => {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        setActiveTab(tab)
      })
    }

    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        setActiveTab(tabs[0])
      }
    })

    chrome.tabs.onActivated.addListener(handleTabChange)

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabChange)
    }
  }, [])

  return { activeTab }
}

export { useActiveTab }
