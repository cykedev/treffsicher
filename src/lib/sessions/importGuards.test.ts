import { describe, it, expect } from "vitest"
import { assertPublicImportTarget, isForbiddenImportIp, validatePdfBuffer } from "./importGuards"

describe("isForbiddenImportIp", () => {
  it("blockt lokale und private IPv4-Adressen", () => {
    expect(isForbiddenImportIp("127.0.0.1")).toBe(true)
    expect(isForbiddenImportIp("10.2.3.4")).toBe(true)
    expect(isForbiddenImportIp("172.16.1.1")).toBe(true)
    expect(isForbiddenImportIp("192.168.1.1")).toBe(true)
    expect(isForbiddenImportIp("169.254.10.20")).toBe(true)
  })

  it("blockt lokale und private IPv6-Adressen", () => {
    expect(isForbiddenImportIp("::1")).toBe(true)
    expect(isForbiddenImportIp("fc00::1")).toBe(true)
    expect(isForbiddenImportIp("fd12:3456::1")).toBe(true)
    expect(isForbiddenImportIp("fe80::1234")).toBe(true)
    expect(isForbiddenImportIp("::ffff:127.0.0.1")).toBe(true)
  })

  it("erlaubt öffentliche IP-Adressen", () => {
    expect(isForbiddenImportIp("195.201.88.185")).toBe(false)
    expect(isForbiddenImportIp("8.8.8.8")).toBe(false)
    expect(isForbiddenImportIp("2001:4860:4860::8888")).toBe(false)
  })
})

describe("assertPublicImportTarget", () => {
  it("blockt localhost direkt", async () => {
    await expect(assertPublicImportTarget("localhost")).rejects.toThrow(
      "Lokale Adressen sind nicht erlaubt."
    )
  })

  it("blockt private IP-Literale direkt", async () => {
    await expect(assertPublicImportTarget("192.168.0.5")).rejects.toThrow(
      "Private oder lokale IP-Adressen sind nicht erlaubt."
    )
  })

  it("erlaubt Hostnamen mit öffentlicher Auflösung", async () => {
    await expect(
      assertPublicImportTarget("meyton.example", async () => ["195.201.88.185"])
    ).resolves.toBeUndefined()
  })

  it("blockt Hostnamen die auf private IPs auflösen", async () => {
    await expect(
      assertPublicImportTarget("evil.example", async () => ["10.0.0.7"])
    ).rejects.toThrow("Host loest auf private oder lokale IP-Adressen auf.")
  })
})

describe("validatePdfBuffer", () => {
  it("akzeptiert ein plausibles PDF", () => {
    const content = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF", "latin1")
    expect(() => validatePdfBuffer(content)).not.toThrow()
  })

  it("lehnt Dateien ohne PDF-Header ab", () => {
    const content = Buffer.from("NOT_PDF_CONTENT", "latin1")
    expect(() => validatePdfBuffer(content)).toThrow("Die Datei hat keinen gueltigen PDF-Header.")
  })

  it("lehnt Dateien ohne EOF-Marker ab", () => {
    const content = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n", "latin1")
    expect(() => validatePdfBuffer(content)).toThrow(
      "Die Datei scheint kein vollstaendiges PDF zu sein."
    )
  })
})
