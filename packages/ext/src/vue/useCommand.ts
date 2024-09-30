import { reactive } from "vue"
import { useEventListener } from "@vueuse/core"

type Command = chrome.commands.Command

export default function useCommand<T extends string>() {
  const command = reactive<Record<string, Command>>({})

  const updateCommand = () => {
    chrome.commands.getAll((commands) => {
      for (const cmd of commands) {
        command[cmd.name!] = cmd
      }
    })
  }

  updateCommand()
  useEventListener("focus", () => {
    updateCommand()
  })

  return command as Record<T, chrome.commands.Command>
}

export { useCommand }
