import { ref, onMounted, onUnmounted, computed } from "vue"

type OnChange = (state: DocumentVisibilityState) => void

/** @deprecated */
export default function useVisibility(onChange?: OnChange) {
  const state = ref<DocumentVisibilityState>(
    globalThis.document?.visibilityState || "visible"
  )
  const visible = computed(() => state.value === "visible")

  const handleChange = () => {
    state.value = document.visibilityState
    onChange?.(state.value)
  }

  onMounted(() => {
    state.value = document.visibilityState
    document.addEventListener("visibilitychange", handleChange)
  })

  onUnmounted(() => {
    document.removeEventListener("visibilitychange", handleChange)
  })

  return { state, visible }
}

export { useVisibility }
