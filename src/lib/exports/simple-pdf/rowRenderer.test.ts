import { describe, expect, it } from "vitest"
import { INDENT_STEP, LINE_HEIGHT } from "@/lib/exports/simple-pdf/constants"
import { buildRows, drawRows } from "@/lib/exports/simple-pdf/rowRenderer"

describe("buildRows", () => {
  it("baut Field- und Textzeilen mit Einrueckung und GesamtHoehe", () => {
    const result = buildRows(["  Titel: Wettkampf", "Freitext Zeile"], 320, 140)

    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toMatchObject({
      kind: "field",
      indent: INDENT_STEP,
    })
    expect(result.rows[1]).toMatchObject({
      kind: "text",
      indent: 0,
    })
    expect(result.totalHeight).toBe(result.rows[0].height + result.rows[1].height)
  })

  it("setzt leere Werte bei Field-Zeilen auf '-'", () => {
    const result = buildRows(["Label:   "], 280, 120)
    const row = result.rows[0]
    expect(row.kind).toBe("field")
    if (row.kind !== "field") return
    expect(row.valueLines).toEqual(["-"])
  })

  it("erzeugt bei leeren Daten optional einen Platzhalter", () => {
    const withFallback = buildRows([], 280, 120, true)
    const withoutFallback = buildRows([], 280, 120, false)

    expect(withFallback.rows).toHaveLength(1)
    expect(withFallback.rows[0]).toMatchObject({ kind: "text", textLines: ["-"] })
    expect(withoutFallback.rows).toEqual([])
    expect(withoutFallback.totalHeight).toBe(0)
  })

  it("begrenzt die Einrueckung auf maximal zwei Stufen", () => {
    const result = buildRows(["      Tief: Wert"], 280, 120)
    const row = result.rows[0]
    expect(row.kind).toBe("field")
    if (row.kind !== "field") return
    expect(row.indent).toBe(INDENT_STEP * 2)
  })
})

describe("drawRows", () => {
  it("rendert Field- und Textzeilen in PDF-Textbefehle", () => {
    const rows = buildRows(["Name: Max", "Notiz"], 260, 120).rows
    const commands: string[] = []

    drawRows(rows, 40, 700, (command) => commands.push(command))

    expect(commands.some((command) => command.includes("(Name)"))).toBe(true)
    expect(commands.some((command) => command.includes("(Max)"))).toBe(true)
    expect(commands.some((command) => command.includes("(Notiz)"))).toBe(true)
  })

  it("versetzt mehrzeilige Rows in LINE_HEIGHT-Schritten", () => {
    const rows = buildRows(["Titel: eins zwei drei vier fuenf sechs sieben acht"], 120, 92).rows
    const commands: string[] = []

    drawRows(rows, 10, 500, (command) => commands.push(command))

    const yValues = commands
      .filter((command) => command.includes(" Td "))
      .map((command) => {
        const match = command.match(/ ([0-9.]+) ([0-9.]+) Td /)
        return match ? Number(match[2]) : null
      })
      .filter((value): value is number => value !== null)

    const uniqueDescending = [...new Set(yValues.map((value) => value.toFixed(3)))]
      .map((value) => Number(value))
      .sort((a, b) => b - a)

    expect(uniqueDescending.length).toBeGreaterThan(1)
    expect(uniqueDescending[0] - uniqueDescending[1]).toBeCloseTo(LINE_HEIGHT, 0)
  })
})
