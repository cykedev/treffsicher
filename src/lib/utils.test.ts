import { describe, expect, it } from "vitest"
import { cn } from "@/lib/utils"

describe("cn", () => {
  it("kombiniert clsx-Eingaben und merged widerspruechliche Tailwind-Klassen", () => {
    const result = cn("p-2", false && "hidden", ["text-sm", "p-4"], { "font-bold": true })

    expect(result).toBe("text-sm p-4 font-bold")
  })
})
