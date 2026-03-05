import { beforeEach, describe, expect, it, vi } from "vitest"

const { compareMock, hashMock, getAuthSessionMock, validationMock, findUniqueMock, updateMock } =
  vi.hoisted(() => ({
    compareMock: vi.fn(),
    hashMock: vi.fn(),
    getAuthSessionMock: vi.fn(),
    validationMock: vi.fn(),
    findUniqueMock: vi.fn(),
    updateMock: vi.fn(),
  }))

vi.mock("bcryptjs", () => ({
  default: {
    compare: compareMock,
    hash: hashMock,
  },
}))

vi.mock("@/lib/auth-helpers", () => ({
  getAuthSession: getAuthSessionMock,
}))

vi.mock("@/lib/authValidation", () => ({
  validatePasswordChangeInput: validationMock,
}))

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: findUniqueMock,
      update: updateMock,
    },
  },
}))

import { changeOwnPassword } from "@/lib/account/actions"

function createFormData(currentPassword: string, newPassword: string, confirmPassword: string): FormData {
  const formData = new FormData()
  formData.set("currentPassword", currentPassword)
  formData.set("newPassword", newPassword)
  formData.set("confirmPassword", confirmPassword)
  return formData
}

describe("changeOwnPassword", () => {
  beforeEach(() => {
    compareMock.mockReset()
    hashMock.mockReset()
    getAuthSessionMock.mockReset()
    validationMock.mockReset()
    findUniqueMock.mockReset()
    updateMock.mockReset()
    validationMock.mockReturnValue(null)
  })

  it("liefert Fehler wenn kein Login vorhanden ist", async () => {
    getAuthSessionMock.mockResolvedValue(null)

    const result = await changeOwnPassword(null, createFormData("alt", "neu12345", "neu12345"))

    expect(result).toEqual({ error: "Nicht angemeldet." })
  })

  it("liefert Validierungsfehler direkt zurueck", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    validationMock.mockReturnValue("Passwort zu kurz")

    const result = await changeOwnPassword(null, createFormData("alt", "x", "x"))

    expect(result).toEqual({ error: "Passwort zu kurz" })
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it("liefert Fehler wenn Nutzer nicht in DB gefunden wird", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findUniqueMock.mockResolvedValue(null)

    const result = await changeOwnPassword(null, createFormData("alt", "neu12345", "neu12345"))

    expect(result).toEqual({ error: "Nutzer nicht gefunden." })
  })

  it("liefert Fehler bei falschem aktuellem Passwort", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findUniqueMock.mockResolvedValue({ id: "user-1", passwordHash: "hash-alt" })
    compareMock.mockResolvedValue(false)

    const result = await changeOwnPassword(null, createFormData("falsch", "neu12345", "neu12345"))

    expect(result).toEqual({ error: "Aktuelles Passwort ist falsch." })
    expect(updateMock).not.toHaveBeenCalled()
  })

  it("hashed neues Passwort und erhoeht sessionVersion bei Erfolg", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findUniqueMock.mockResolvedValue({ id: "user-1", passwordHash: "hash-alt" })
    compareMock.mockResolvedValue(true)
    hashMock.mockResolvedValue("hash-neu")
    updateMock.mockResolvedValue({})

    const result = await changeOwnPassword(
      null,
      createFormData("alt12345", "neu12345", "neu12345")
    )

    expect(result).toEqual({ success: true })
    expect(compareMock).toHaveBeenCalledWith("alt12345", "hash-alt")
    expect(hashMock).toHaveBeenCalledWith("neu12345", 12)
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: "hash-neu",
        sessionVersion: { increment: 1 },
      },
    })
  })
})
