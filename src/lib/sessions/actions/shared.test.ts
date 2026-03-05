import { describe, expect, it } from "vitest"
import {
  calculateSeriesTotal,
  mapShotToScoringType,
  MAX_GOAL_IDS_PER_REQUEST,
  MAX_SERIES_PER_SESSION,
  parseGoalIdsFromFormData,
  parseHitLocationFromFormData,
  parseSeriesFromFormData,
} from "@/lib/sessions/actions/shared"

describe("parseGoalIdsFromFormData", () => {
  it("dedupliziert und begrenzt auf das definierte Maximum", () => {
    const formData = new FormData()
    formData.append("goalIds", "goal-1")
    formData.append("goalIds", "goal-1")
    for (let i = 0; i < MAX_GOAL_IDS_PER_REQUEST + 5; i++) {
      formData.append("goalIds", `goal-${i + 2}`)
    }

    const ids = parseGoalIdsFromFormData(formData)

    expect(ids[0]).toBe("goal-1")
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBe(MAX_GOAL_IDS_PER_REQUEST)
  })
})

describe("parseHitLocationFromFormData", () => {
  it("liefert null wenn keine Trefferlage gesetzt ist", () => {
    const formData = new FormData()
    expect(parseHitLocationFromFormData(formData)).toBeNull()
  })

  it("liefert INVALID bei teilweiser Eingabe", () => {
    const formData = new FormData()
    formData.set("hitLocationHorizontalMm", "1.2")
    formData.set("hitLocationHorizontalDirection", "RIGHT")
    expect(parseHitLocationFromFormData(formData)).toBe("INVALID")
  })

  it("parst gueltige Werte inkl. Kommaformat", () => {
    const formData = new FormData()
    formData.set("hitLocationHorizontalMm", "2,34")
    formData.set("hitLocationHorizontalDirection", "LEFT")
    formData.set("hitLocationVerticalMm", "1.10")
    formData.set("hitLocationVerticalDirection", "HIGH")

    expect(parseHitLocationFromFormData(formData)).toEqual({
      horizontalMm: 2.34,
      horizontalDirection: "LEFT",
      verticalMm: 1.1,
      verticalDirection: "HIGH",
    })
  })

  it("liefert INVALID fuer ungueltige Richtungswerte", () => {
    const formData = new FormData()
    formData.set("hitLocationHorizontalMm", "2.34")
    formData.set("hitLocationHorizontalDirection", "SIDEWAYS")
    formData.set("hitLocationVerticalMm", "1.10")
    formData.set("hitLocationVerticalDirection", "HIGH")

    expect(parseHitLocationFromFormData(formData)).toBe("INVALID")
  })
})

describe("mapShotToScoringType", () => {
  it("mappt Ganzring-Wertungen ueber floor", () => {
    expect(mapShotToScoringType(9.9, "WHOLE")).toBe("9")
  })

  it("laesst Zehntel-Wertungen auf eine Nachkommastelle", () => {
    expect(mapShotToScoringType(9.94, "TENTH")).toBe("9.9")
  })
})

describe("calculateSeriesTotal", () => {
  it("liefert Ganzring-Summen ohne Zehntelreste", () => {
    expect(calculateSeriesTotal(["9", "10", "8"], "WHOLE")).toBe("27")
  })

  it("rundet Zehntel-Summen korrekt", () => {
    expect(calculateSeriesTotal(["9.9", "10.0", "8.2"], "TENTH")).toBe("28.1")
  })
})

describe("parseSeriesFromFormData", () => {
  it("parst Seriendaten inklusive Shots und Ausfuehrungsqualitaet", () => {
    const formData = new FormData()
    formData.set("series[0][scoreTotal]", "95")
    formData.set("series[0][isPractice]", "false")
    formData.set("series[0][shots]", JSON.stringify(["10.0", "", "9.5"]))
    formData.set("series[0][executionQuality]", "4")
    formData.set("series[1][scoreTotal]", "")
    formData.set("series[1][isPractice]", "true")
    formData.set("series[1][shots]", JSON.stringify(["8.0"]))
    formData.set("series[1][executionQuality]", "9")

    expect(parseSeriesFromFormData(formData)).toEqual([
      {
        position: 1,
        isPractice: false,
        scoreTotal: "95",
        shots: ["10.0", "9.5"],
        executionQuality: 4,
      },
      {
        position: 2,
        isPractice: true,
        scoreTotal: null,
        shots: ["8.0"],
        executionQuality: null,
      },
    ])
  })

  it("bricht ab wenn mehr als die maximale Serienanzahl gesendet wird", () => {
    const formData = new FormData()
    for (let i = 0; i <= MAX_SERIES_PER_SESSION; i++) {
      formData.set(`series[${i}][scoreTotal]`, "10")
      formData.set(`series[${i}][isPractice]`, "false")
    }

    expect(parseSeriesFromFormData(formData)).toBeNull()
  })
})
