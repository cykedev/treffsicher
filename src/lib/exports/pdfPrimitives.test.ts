import { describe, expect, it } from "vitest"
import {
  clamp,
  concatBytes,
  encodeLatin1,
  hexToRgb,
  polygonFillCommand,
  sanitizeText,
  textCommand,
  wrapText,
} from "@/lib/exports/pdfPrimitives"

describe("sanitizeText", () => {
  it("normalisiert Steuer- und Typografiezeichen fuer stabile PDF-Streams", () => {
    const result = sanitizeText("A\u0000B – … ‘x’ “y”")

    expect(result).toBe(`A B - ... 'x' "y"`)
  })

  it("ersetzt Zeichen ausserhalb Latin-1 durch Platzhalter", () => {
    const result = sanitizeText("Score 😀")

    expect(result).toBe("Score ??")
  })
})

describe("wrapText", () => {
  it("bricht Text auf Basis von Breite und Schriftgroesse in Zeilen um", () => {
    const lines = wrapText("eins zwei drei vier", 65, 10)

    expect(lines).toEqual(["eins zwei", "drei vier"])
  })

  it("teilt zu lange Woerter in feste Teilstuecke", () => {
    const lines = wrapText("x abcdefghijklmnop", 40, 10)

    expect(lines).toEqual(["x", "abcdefgh", "ijklmnop"])
  })
})

describe("concatBytes", () => {
  it("verbindet mehrere Uint8Arrays in Reihenfolge", () => {
    const result = concatBytes([new Uint8Array([1, 2]), new Uint8Array([]), new Uint8Array([3])])

    expect(Array.from(result)).toEqual([1, 2, 3])
  })
})

describe("encodeLatin1", () => {
  it("kodiert Latin-1 direkt und mappt sonst auf '?'", () => {
    const result = encodeLatin1("AÄ😀")

    expect(Array.from(result)).toEqual([65, 196, 63, 63])
  })
})

describe("textCommand", () => {
  it("escaped Klammern und Backslashes im PDF-Text", () => {
    const command = textCommand(10.25, 20.5, "A (B) \\ C – D", 12, true, [0.1, 0.2, 0.3])

    expect(command).toContain("/F2 12 Tf")
    expect(command).toContain("10.25 20.5 Td")
    expect(command).toContain("(A \\(B\\) \\\\ C - D)")
  })
})

describe("polygonFillCommand", () => {
  it("liefert leeren Befehl fuer weniger als drei Punkte", () => {
    const result = polygonFillCommand(
      [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
      [1, 0, 0]
    )

    expect(result).toBe("")
  })
})

describe("clamp", () => {
  it("begrenzt Werte auf den Bereich", () => {
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe("hexToRgb", () => {
  it("parst gueltige Hex-Werte und nutzt Fallback bei ungueltigen Eingaben", () => {
    expect(hexToRgb("#3366CC", [0, 0, 0])).toEqual([0.2, 0.4, 0.8])
    expect(hexToRgb("not-hex", [1, 1, 1])).toEqual([1, 1, 1])
    expect(hexToRgb(undefined, [1, 0, 0])).toEqual([1, 0, 0])
  })
})
