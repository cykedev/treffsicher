import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

function isForbiddenIpv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true
  }

  const [a, b] = parts

  // Nicht-routbare oder interne IPv4-Bereiche
  if (a === 0) return true // 0.0.0.0/8
  if (a === 10) return true // 10.0.0.0/8
  if (a === 127) return true // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true // 169.254.0.0/16 (link-local)
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
  if (a === 192 && b === 168) return true // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 (CGNAT)
  if (a === 198 && (b === 18 || b === 19)) return true // 198.18.0.0/15
  if (a >= 224) return true // Multicast/Reserved/Broadcast

  return false
}

function isForbiddenIpv6(ip: string): boolean {
  const lower = ip.toLowerCase()

  if (lower === "::" || lower === "::1") return true // unspecified / loopback
  if (lower.startsWith("fe80:") || lower.startsWith("fe9:") || lower.startsWith("fea:")) {
    return true // fe80::/10 (link-local)
  }
  if (lower.startsWith("feb:")) return true // fe80::/10 (link-local)
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true // fc00::/7 (ULA)

  // IPv4-mapped IPv6 (z. B. ::ffff:127.0.0.1)
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice("::ffff:".length)
    return isForbiddenIpv4(mapped)
  }

  return false
}

/**
 * Prüft ob eine IP für externe URL-Downloads gesperrt ist.
 * Gesperrt werden lokale/private/link-local/loopback/ULA-Bereiche.
 */
export function isForbiddenImportIp(ip: string): boolean {
  const family = isIP(ip)
  if (family === 4) return isForbiddenIpv4(ip)
  if (family === 6) return isForbiddenIpv6(ip)
  return true
}

async function resolveAddresses(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true })
  return [...new Set(records.map((record) => record.address))]
}

/**
 * Stellt sicher, dass ein Zielhost auf öffentliche Adressen auflöst.
 * Verhindert SSRF auf lokale/private Netzbereiche.
 */
export async function assertPublicImportTarget(
  hostname: string,
  resolver: (hostname: string) => Promise<string[]> = resolveAddresses
): Promise<void> {
  const normalizedHost = hostname.trim().toLowerCase()

  if (!normalizedHost) {
    throw new Error("Die URL ist ungueltig.")
  }

  if (normalizedHost === "localhost" || normalizedHost.endsWith(".localhost")) {
    throw new Error("Lokale Adressen sind nicht erlaubt.")
  }

  // IP-Literal direkt prüfen
  if (isIP(normalizedHost)) {
    if (isForbiddenImportIp(normalizedHost)) {
      throw new Error("Private oder lokale IP-Adressen sind nicht erlaubt.")
    }
    return
  }

  const resolved = await resolver(normalizedHost)
  if (resolved.length === 0) {
    throw new Error("Host konnte nicht aufgeloest werden.")
  }

  if (resolved.some((ip) => isForbiddenImportIp(ip))) {
    throw new Error("Host loest auf private oder lokale IP-Adressen auf.")
  }
}

/**
 * Prüft, ob die geladene Datei plausibel ein PDF ist.
 * Es wird kein aktiver Inhalt ausgeführt.
 */
export function validatePdfBuffer(buffer: Buffer): void {
  if (buffer.length < 8) {
    throw new Error("Die Datei ist zu kurz und kein gueltiges PDF.")
  }

  const header = buffer.subarray(0, 5).toString("latin1")
  if (header !== "%PDF-") {
    throw new Error("Die Datei hat keinen gueltigen PDF-Header.")
  }

  // EOF-Marker nahe Dateiende erwarten (tolerant für Zeilenumbrueche/Trailing-Bytes)
  const tailStart = Math.max(0, buffer.length - 2048)
  const tail = buffer.subarray(tailStart).toString("latin1")
  if (!tail.includes("%%EOF")) {
    throw new Error("Die Datei scheint kein vollstaendiges PDF zu sein.")
  }
}
