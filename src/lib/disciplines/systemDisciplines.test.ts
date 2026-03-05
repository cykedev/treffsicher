import { describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@/generated/prisma/client"
import { ensureSystemDisciplines } from "@/lib/disciplines/systemDisciplines"

function createPrismaMock() {
  const findUniqueMock = vi.fn()
  const createMock = vi.fn()

  const prisma = {
    discipline: {
      findUnique: findUniqueMock,
      create: createMock,
    },
  } as unknown as PrismaClient

  return { prisma, findUniqueMock, createMock }
}

describe("ensureSystemDisciplines", () => {
  it("legt alle fehlenden System-Disziplinen mit deterministischen IDs an", async () => {
    const { prisma, findUniqueMock, createMock } = createPrismaMock()
    findUniqueMock.mockResolvedValue(null)
    createMock.mockResolvedValue({})

    const created = await ensureSystemDisciplines(prisma)

    expect(created).toBe(5)
    expect(createMock).toHaveBeenCalledTimes(5)
    expect(createMock.mock.calls.map((call) => call[0].data.id)).toEqual([
      "system-luftpistole",
      "system-luftgewehr",
      "system-luftgewehr-zehntel",
      "system-luftpistole-auflage",
      "system-luftgewehr-auflage",
    ])
  })

  it("ueberspringt bereits vorhandene System-Disziplinen", async () => {
    const { prisma, findUniqueMock, createMock } = createPrismaMock()
    findUniqueMock.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "system-luftpistole" || where.id === "system-luftgewehr") {
        return { id: where.id }
      }
      return null
    })
    createMock.mockResolvedValue({})

    const created = await ensureSystemDisciplines(prisma)

    expect(created).toBe(3)
    expect(createMock.mock.calls.map((call) => call[0].data.id)).toEqual([
      "system-luftgewehr-zehntel",
      "system-luftpistole-auflage",
      "system-luftgewehr-auflage",
    ])
  })
})
