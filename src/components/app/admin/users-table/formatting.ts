import type { AdminUserListItem } from "@/lib/admin/actions"

export function getRoleBadgeClass(role: AdminUserListItem["role"]): string {
  if (role === "ADMIN") {
    return "border-amber-800 bg-amber-950 text-amber-300"
  }
  return "border-sky-800 bg-sky-950 text-sky-300"
}

export function getStatusBadgeClass(isActive: boolean): string {
  if (isActive) {
    return "border-emerald-800 bg-emerald-950 text-emerald-300"
  }
  return "border-zinc-700 bg-zinc-900 text-zinc-300"
}

export function formatDate(date: Date, displayTimeZone: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: displayTimeZone,
  }).format(new Date(date))
}

export function formatOptionalDate(date: Date | null, displayTimeZone: string): string {
  if (!date) return "—"
  return formatDate(date, displayTimeZone)
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("de-CH").format(value)
}
