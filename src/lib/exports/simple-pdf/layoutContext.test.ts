import { describe, expect, it } from "vitest"
import { MARGIN_BOTTOM, MARGIN_TOP, PAGE_HEIGHT } from "@/lib/exports/simple-pdf/constants"
import {
  addCommand,
  createInitialLayoutContext,
  ensureSpace,
} from "@/lib/exports/simple-pdf/layoutContext"

describe("createInitialLayoutContext", () => {
  it("initialisiert mit erster Seite und oberem Start-Y", () => {
    const context = createInitialLayoutContext()

    expect(context.pages).toEqual([[]])
    expect(context.pageIndex).toBe(0)
    expect(context.y).toBe(PAGE_HEIGHT - MARGIN_TOP)
  })
})

describe("addCommand", () => {
  it("haengt Befehle an die aktuelle Seite an", () => {
    const context = createInitialLayoutContext()

    addCommand(context, "cmd-1")
    addCommand(context, "cmd-2")

    expect(context.pages[0]).toEqual(["cmd-1", "cmd-2"])
  })
})

describe("ensureSpace", () => {
  it("behaelt Seite bei wenn genug Platz vorhanden ist", () => {
    const context = createInitialLayoutContext()
    const originalY = context.y

    ensureSpace(context, 40)

    expect(context.pageIndex).toBe(0)
    expect(context.pages).toHaveLength(1)
    expect(context.y).toBe(originalY)
  })

  it("legt neue Seite an wenn Restplatz unter den unteren Rand fallen wuerde", () => {
    const context = createInitialLayoutContext()
    context.y = MARGIN_BOTTOM + 5
    addCommand(context, "old-page")

    ensureSpace(context, 6)

    expect(context.pages).toHaveLength(2)
    expect(context.pageIndex).toBe(1)
    expect(context.y).toBe(PAGE_HEIGHT - MARGIN_TOP)
    expect(context.pages[0]).toEqual(["old-page"])
    expect(context.pages[1]).toEqual([])
  })
})
