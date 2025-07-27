import { reactive } from "vue"
import { useEventListener } from "@vueuse/core"

type Command = chrome.commands.Command

export function useCommand<T extends string>() {
  const command = reactive<Record<string, Command | undefined>>({})

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

  return command as Record<T, Command | undefined>
}

export function useCommands<T extends string>(
  getAll = chrome.commands?.getAll
) {
  const command = reactive<{ [key in T]?: Command }>({})
  const updateCommand = async () => {
    const commands = await getAll()
    for (const cmd of commands) {
      ;(command as Record<T, Command>)[cmd.name! as T] = cmd
    }
    return commands
  }

  updateCommand()
  useEventListener("focus", () => {
    updateCommand()
  })
  return { command, updateCommand }
}
