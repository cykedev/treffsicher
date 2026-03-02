const URL_WITH_SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//

export function normalizeMeytonPdfUrlInput(rawValue: string): string {
  const trimmed = rawValue.trim()
  if (!trimmed) return ""

  if (trimmed.startsWith("//")) {
    return `http:${trimmed}`
  }

  if (URL_WITH_SCHEME_REGEX.test(trimmed)) {
    return trimmed
  }

  // Keine implizite HTTP-Normalisierung bei Userinfo/Sonderschemata wie mailto:user@example.com
  if (trimmed.includes("@")) {
    return trimmed
  }

  return `http://${trimmed}`
}
