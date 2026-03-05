import { describe, expect, it } from "vitest"
import { drawBadge } from "@/lib/exports/simple-pdf/badgeRenderer"

describe("drawBadge", () => {
  it("rendert das TS-Glyph mit Basisrahmen und Zielsymbol", () => {
    const commands: string[] = []

    drawBadge(20, 200, "ts", [0.2, 0.3, 0.4], (command) => commands.push(command))

    expect(commands).toHaveLength(7)
    expect(commands[0]).toContain(" re f")
    expect(commands[1]).toContain(" re S")
    expect(commands.some((command) => command.includes(" c S"))).toBe(true)
    expect(commands.some((command) => command.includes(" l S"))).toBe(true)
  })

  it("faellt bei unbekanntem Label auf Punkt-Glyph zurueck", () => {
    const commands: string[] = []

    drawBadge(20, 200, "??", [0.2, 0.3, 0.4], (command) => commands.push(command))

    expect(commands).toHaveLength(3)
    expect(commands[2]).toContain(" f")
  })

  it("begrenzt Labels auf zwei Zeichen und nutzt Fallback bei leerem Label", () => {
    const commandsLong: string[] = []
    const commandsEmpty: string[] = []

    drawBadge(10, 100, "tl-extra", [0.1, 0.2, 0.3], (command) => commandsLong.push(command))
    drawBadge(10, 100, "   ", [0.1, 0.2, 0.3], (command) => commandsEmpty.push(command))

    expect(commandsLong).toHaveLength(7)
    expect(commandsEmpty).toHaveLength(3)
  })
})
