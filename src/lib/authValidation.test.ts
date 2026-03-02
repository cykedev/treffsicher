import { describe, expect, it } from "vitest"
import { MAX_USER_EMAIL_LENGTH, normalizeLoginEmail } from "./authValidation"

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
