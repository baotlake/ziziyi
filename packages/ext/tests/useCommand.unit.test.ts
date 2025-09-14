import { describe, test, expect, vi, beforeEach } from "vitest"
import {
  useCommand,
  useCommands,
  // useCommandUpdate,
} from "../src/vue/useCommand"
import { nextTick } from "vue"

const mockCommands = [
  { name: "command-1", description: "desc 1", shortcut: "Ctrl+1" },
  { name: "command-2", description: "desc 2", shortcut: "Ctrl+2" },
]

const getAll = vi.fn((cb) => cb(mockCommands))

vi.stubGlobal("chrome", {
  commands: {
    getAll,
  },
})

describe("@packages/ext/src/vue/useCommand.ts", () => {
  beforeEach(() => {
    getAll.mockClear()
  })

  test("useCommand", () => {
    const command = useCommand()
    expect(getAll).toHaveBeenCalledOnce()
    expect(command["command-1"]).toEqual(mockCommands[0])
    expect(command["command-2"]).toEqual(mockCommands[1])
  })

  test("useCommands", async () => {
    const getAllAsync = vi.fn().mockResolvedValue(mockCommands)
    const { command, updateCommand } = useCommands(getAllAsync)
    expect(getAllAsync).toHaveBeenCalledOnce()
    await nextTick()
    expect(command["command-1"]).toEqual(mockCommands[0])
    expect(command["command-2"]).toEqual(mockCommands[1])

    // test update
    const newCommands = [{ name: "command-3", shortcut: "Ctrl+3" }]
    getAllAsync.mockResolvedValue(newCommands)
    await updateCommand()
    expect(command["command-3"]).toEqual(newCommands[0])
    // old commands should still be there
    expect(command["command-1"]).toEqual(mockCommands[0])
  })

  // test("useCommandUpdate", async () => {
  //   const getAllAsync = vi.fn().mockResolvedValue(mockCommands)
  //   const update = vi.fn()
  //   const { updateCommand } = useCommandUpdate(update, getAllAsync)
  //   expect(getAllAsync).toHaveBeenCalledOnce()
  //   await nextTick()
  //   expect(update).toHaveBeenCalledWith(mockCommands)

  //   // test update
  //   const newCommands = [{ name: "command-3", shortcut: "Ctrl+3" }]
  //   getAllAsync.mockResolvedValue(newCommands)
  //   update.mockClear()
  //   await updateCommand()
  //   expect(update).toHaveBeenCalledWith(newCommands)
  // })
})