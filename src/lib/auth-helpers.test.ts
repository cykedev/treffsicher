import { beforeEach, describe, expect, it, vi } from "vitest"

const { getServerSessionMock, findUniqueMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  findUniqueMock: vi.fn(),
}))

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: findUniqueMock,
    },
  },
}))

import { getAuthSession } from "@/lib/auth-helpers"

describe("getAuthSession", () => {
  beforeEach(() => {
    getServerSessionMock.mockReset()
    findUniqueMock.mockReset()
  })

  it("liefert null wenn keine Session oder keine user.id vorhanden ist", async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    expect(await getAuthSession()).toBeNull()

    getServerSessionMock.mockResolvedValueOnce({ user: {} })
    expect(await getAuthSession()).toBeNull()

    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it("liefert null wenn Nutzer in DB fehlt oder deaktiviert ist", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "user-1", sessionVersion: 2, role: "USER", name: "Alt" },
    })
    findUniqueMock.mockResolvedValueOnce(null)

    expect(await getAuthSession()).toBeNull()

    findUniqueMock.mockResolvedValueOnce({
      id: "user-1",
      name: "Alt",
      role: "USER",
      isActive: false,
      sessionVersion: 2,
    })
    expect(await getAuthSession()).toBeNull()
  })

  it("liefert null bei sessionVersion-Mismatch", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "user-1", sessionVersion: 3, role: "USER", name: "Alt" },
    })
    findUniqueMock.mockResolvedValue({
      id: "user-1",
      name: "Neu",
      role: "ADMIN",
      isActive: true,
      sessionVersion: 4,
    })

    expect(await getAuthSession()).toBeNull()
  })

  it("liefert Session mit aus DB synchronisiertem Namen und Rolle", async () => {
    const session = {
      user: { id: "user-1", sessionVersion: 4, role: "USER", name: "JWT-Name" },
    }
    getServerSessionMock.mockResolvedValue(session)
    findUniqueMock.mockResolvedValue({
      id: "user-1",
      name: "DB-Name",
      role: "ADMIN",
      isActive: true,
      sessionVersion: 4,
    })

    const result = await getAuthSession()

    expect(result).not.toBeNull()
    expect(result?.user.name).toBe("DB-Name")
    expect(result?.user.role).toBe("ADMIN")
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { id: true, name: true, role: true, isActive: true, sessionVersion: true },
    })
  })
})
