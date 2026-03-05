import { describe, expect, it } from "vitest"
import {
  emailKey,
  ipKey,
  normalizeEmail,
  normalizeIpHeaderValue,
} from "@/lib/auth-rate-limit/normalization"

describe("emailKey", () => {
  it("prefixiert den Key stabil mit 'email:'", () => {
    expect(emailKey("user@example.com")).toBe("email:user@example.com")
  })
})

describe("ipKey", () => {
  it("prefixiert den Key stabil mit 'ip:'", () => {
    expect(ipKey("203.0.113.10")).toBe("ip:203.0.113.10")
  })
})

describe("normalizeEmail", () => {
  it("trimmt, normalisiert auf lowercase und begrenzt auf 320 Zeichen", () => {
    const longLocal = `${"A".repeat(400)}@EXAMPLE.COM`
    const normalized = normalizeEmail(`  ${longLocal}  `)

    expect(normalized).toBe(`${"a".repeat(320)}`)
    expect(normalized.length).toBe(320)
  })
})

describe("normalizeIpHeaderValue", () => {
  it("verwendet die erste gueltige IP aus x-forwarded-for", () => {
    const result = normalizeIpHeaderValue("203.0.113.5, 10.0.0.4")

    expect(result).toBe("203.0.113.5")
  })

  it("unterstuetzt IPv6", () => {
    const result = normalizeIpHeaderValue("2001:db8::1")

    expect(result).toBe("2001:db8::1")
  })

  it("liefert null bei fehlenden, ungueltigen oder zu langen Werten", () => {
    expect(normalizeIpHeaderValue(undefined)).toBeNull()
    expect(normalizeIpHeaderValue("not-an-ip")).toBeNull()
    expect(normalizeIpHeaderValue("1".repeat(65))).toBeNull()
  })
})
