import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { revalidatePathMock, getAuthSessionMock, findFirstMock, deleteMock, unlinkMock } =
  vi.hoisted(() => ({
    revalidatePathMock: vi.fn(),
    getAuthSessionMock: vi.fn(),
    findFirstMock: vi.fn(),
    deleteMock: vi.fn(),
    unlinkMock: vi.fn(),
  }))

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}))

vi.mock("@/lib/auth-helpers", () => ({
  getAuthSession: getAuthSessionMock,
}))

vi.mock("@/lib/db", () => ({
  db: {
    trainingSession: {
      findFirst: findFirstMock,
      delete: deleteMock,
    },
  },
}))

vi.mock("fs/promises", () => ({
  unlink: unlinkMock,
}))

import { deleteSessionAction } from "@/lib/sessions/actions/session/deleteSession"

describe("deleteSessionAction", () => {
  const originalUploadDir = process.env.UPLOAD_DIR

  beforeEach(() => {
    revalidatePathMock.mockReset()
    getAuthSessionMock.mockReset()
    findFirstMock.mockReset()
    deleteMock.mockReset()
    unlinkMock.mockReset()
    process.env.UPLOAD_DIR = "/tmp/uploads-test"
  })

  afterEach(() => {
    if (originalUploadDir === undefined) {
      delete process.env.UPLOAD_DIR
    } else {
      process.env.UPLOAD_DIR = originalUploadDir
    }
  })

  it("liefert Fehler ohne Login", async () => {
    getAuthSessionMock.mockResolvedValue(null)

    const result = await deleteSessionAction("s1")

    expect(result).toEqual({ error: "Nicht angemeldet" })
  })

  it("liefert Fehler wenn Session nicht gefunden wird", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue(null)

    const result = await deleteSessionAction("s1")

    expect(result).toEqual({ error: "Einheit nicht gefunden" })
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it("loescht Attachments tolerant und entfernt Session", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue({
      id: "s1",
      attachments: [{ filePath: "a.pdf" }, { filePath: "b.jpg" }],
    })
    unlinkMock.mockResolvedValueOnce(undefined)
    unlinkMock.mockRejectedValueOnce(new Error("missing file"))
    deleteMock.mockResolvedValue({})

    const result = await deleteSessionAction("s1")

    expect(result).toEqual({ success: true })
    expect(unlinkMock).toHaveBeenCalledWith("/tmp/uploads-test/a.pdf")
    expect(unlinkMock).toHaveBeenCalledWith("/tmp/uploads-test/b.jpg")
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "s1" } })
    expect(revalidatePathMock).toHaveBeenCalledWith("/sessions")
  })
})
