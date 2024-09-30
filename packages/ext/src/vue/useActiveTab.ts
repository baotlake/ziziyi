import { ref, onMounted, onUnmounted } from "vue"

export default function useActiveTab() {
  const activeTab = ref<chrome.tabs.Tab | null>(null)

  const handleTabChange = (activeInfo: chrome.tabs.TabActiveInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      activeTab.value = tab
    })
  }

  onMounted(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      activeTab.value = tabs[0]
    })
    chrome.tabs.onActivated.addListener(handleTabChange)
  })

  onUnmounted(() => {
    chrome.tabs.onActivated.removeListener(handleTabChange)
  })

  return { activeTab }
}

export { useActiveTab }
