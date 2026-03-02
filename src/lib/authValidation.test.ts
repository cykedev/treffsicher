import { describe, expect, it } from "vitest"
import {
  MAX_PASSWORD_LENGTH,
  MAX_USER_EMAIL_LENGTH,
  MIN_PASSWORD_LENGTH,
  normalizeLoginEmail,
  validatePasswordChangeInput,
} from "./authValidation"

describe("normalizeLoginEmail", () => {
  it("normalisiert und trimmt gueltige E-Mails", () => {
    expect(normalizeLoginEmail("  User@Example.com  ")).toBe("user@example.com")
  })

  it("lehnt leere Werte ab", () => {
    expect(normalizeLoginEmail("   ")).toBeNull()
  })

  it("lehnt zu lange E-Mails ab", () => {
    const tooLong = `${"a".repeat(MAX_USER_EMAIL_LENGTH)}@example.com`
    expect(normalizeLoginEmail(tooLong)).toBeNull()
  })
})

describe("validatePasswordChangeInput", () => {
  it("akzeptiert gueltige Eingaben", () => {
    expect(
      validatePasswordChangeInput({
        currentPassword: "old-password-123",
        newPassword: "new-password-123",
        confirmPassword: "new-password-123",
      })
    ).toBeNull()
  })

  it("lehnt fehlendes aktuelles Passwort ab", () => {
    expect(
      validatePasswordChangeInput({
        currentPassword: "",
        newPassword: "new-password-123",
        confirmPassword: "new-password-123",
      })
    ).toBe("Bitte aktuelles Passwort angeben.")
  })

  it("lehnt zu langes aktuelles Passwort ab", () => {
    expect(
      validatePasswordChangeInput({
        currentPassword: "x".repeat(MAX_PASSWORD_LENGTH + 1),
        newPassword: "new-password-123",
        confirmPassword: "new-password-123",
      })
    ).toBe("Aktuelles Passwort ist zu lang.")
  })

  it("lehnt zu kurze Passwörter ab", () => {
    expect(
      validatePasswordChangeInput({
        currentPassword: "old-password-123",
        newPassword: "x".repeat(MIN_PASSWORD_LENGTH - 1),
        confirmPassword: "x".repeat(MIN_PASSWORD_LENGTH - 1),
      })
    ).toBe(`Neues Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`)
  })

  it("lehnt zu lange Passwörter ab", () => {
    expect(
      validatePasswordChangeInput({
        currentPassword: "old-password-123",
        newPassword: "x".repeat(MAX_PASSWORD_LENGTH + 1),
        confirmPassword: "new-password-123",
      })
    ).toBe("Passwort ist zu lang.")
  })

  it("lehnt unterschiedliche Bestätigung ab", () => {
    expect(
      validatePasswordChangeInput({
        currentPassword: "old-password-123",
        newPassword: "new-password-123",
        confirmPassword: "new-password-124",
      })
    ).toBe("Neues Passwort und Bestätigung stimmen nicht überein.")
  })

  it("lehnt zu lange Passwort-Bestätigung ab", () => {
    expect(
      validatePasswordChangeInput({
        currentPassword: "old-password-123",
        newPassword: "new-password-123",
        confirmPassword: "x".repeat(MAX_PASSWORD_LENGTH + 1),
      })
    ).toBe("Passwort-Bestätigung ist zu lang.")
  })

  it("lehnt identisches neues Passwort ab", () => {
    expect(
      validatePasswordChangeInput({
        currentPassword: "same-password-123",
        newPassword: "same-password-123",
        confirmPassword: "same-password-123",
      })
    ).toBe("Neues Passwort muss sich vom aktuellen Passwort unterscheiden.")
  })
})
