<script setup lang="ts">
import { useAttrs } from "vue"

const props = withDefaults(defineProps(), {
  loading: "lazy",
  referrerpolicy: "no-referrer",
})

const emit = defineEmits<{
  load: [event: Event]
  error: [event: Event]
  click: [event: MouseEvent]
  contextmenu: [event: MouseEvent]
  dblclick: [event: MouseEvent]
  mousedown: [event: MouseEvent]
  mouseup: [event: MouseEvent]
  mouseover: [event: MouseEvent]
  mouseenter: [event: MouseEvent]
  mouseleave: [event: MouseEvent]
  mousemove: [event: MouseEvent]
  mouseout: [event: MouseEvent]
  wheel: [event: WheelEvent]
  touchstart: [event: TouchEvent]
  touchmove: [event: TouchEvent]
  touchend: [event: TouchEvent]
  touchcancel: [event: TouchEvent]
  transitionend: [event: TransitionEvent]
  animationstart: [event: AnimationEvent]
  animationend: [event: AnimationEvent]
}>()

const attrs = useAttrs()
</script>

<template>
  <img v-bind="{ ...props, ...attrs }" v-on="emit" />
</template>
