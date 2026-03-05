import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getQualityVsScoreDataActionMock,
  getRadarComparisonDataActionMock,
  getShotDistributionDataActionMock,
  getStatsDataActionMock,
  getWellbeingCorrelationDataActionMock,
} = vi.hoisted(() => ({
  getQualityVsScoreDataActionMock: vi.fn(),
  getRadarComparisonDataActionMock: vi.fn(),
  getShotDistributionDataActionMock: vi.fn(),
  getStatsDataActionMock: vi.fn(),
  getWellbeingCorrelationDataActionMock: vi.fn(),
}))

vi.mock("@/lib/stats/actions/getQualityVsScoreData", () => ({
  getQualityVsScoreDataAction: getQualityVsScoreDataActionMock,
}))

vi.mock("@/lib/stats/actions/getRadarComparisonData", () => ({
  getRadarComparisonDataAction: getRadarComparisonDataActionMock,
}))

vi.mock("@/lib/stats/actions/getShotDistributionData", () => ({
  getShotDistributionDataAction: getShotDistributionDataActionMock,
}))

vi.mock("@/lib/stats/actions/getStatsData", () => ({
  getStatsDataAction: getStatsDataActionMock,
}))

vi.mock("@/lib/stats/actions/getWellbeingCorrelationData", () => ({
  getWellbeingCorrelationDataAction: getWellbeingCorrelationDataActionMock,
}))

import {
  getQualityVsScoreData,
  getRadarComparisonData,
  getShotDistributionData,
  getStatsData,
  getWellbeingCorrelationData,
} from "@/lib/stats/actions"

describe("stats actions facade", () => {
  beforeEach(() => {
    getQualityVsScoreDataActionMock.mockReset()
    getRadarComparisonDataActionMock.mockReset()
    getShotDistributionDataActionMock.mockReset()
    getStatsDataActionMock.mockReset()
    getWellbeingCorrelationDataActionMock.mockReset()
  })

  it("delegiert alle Statistikabfragen mit identischen Filtern", async () => {
    const filters = {
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
      disciplineId: "d1",
    }
    getStatsDataActionMock.mockResolvedValue([{ id: "s1" }])
    getWellbeingCorrelationDataActionMock.mockResolvedValue([{ sessionId: "s1" }])
    getShotDistributionDataActionMock.mockResolvedValue([{ score: 10, count: 3 }])
    getQualityVsScoreDataActionMock.mockResolvedValue([{ avgQuality: 4, score: 89 }])
    getRadarComparisonDataActionMock.mockResolvedValue([{ id: "s2" }])

    expect(await getStatsData(filters)).toEqual([{ id: "s1" }])
    expect(await getWellbeingCorrelationData(filters)).toEqual([{ sessionId: "s1" }])
    expect(await getShotDistributionData(filters)).toEqual([{ score: 10, count: 3 }])
    expect(await getQualityVsScoreData(filters)).toEqual([{ avgQuality: 4, score: 89 }])
    expect(await getRadarComparisonData(filters)).toEqual([{ id: "s2" }])

    expect(getStatsDataActionMock).toHaveBeenCalledWith(filters)
    expect(getWellbeingCorrelationDataActionMock).toHaveBeenCalledWith(filters)
    expect(getShotDistributionDataActionMock).toHaveBeenCalledWith(filters)
    expect(getQualityVsScoreDataActionMock).toHaveBeenCalledWith(filters)
    expect(getRadarComparisonDataActionMock).toHaveBeenCalledWith(filters)
  })
})
