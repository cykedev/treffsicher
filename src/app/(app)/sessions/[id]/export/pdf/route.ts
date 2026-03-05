import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helpers"
import { buildStyledPdf } from "@/lib/exports/simplePdf"
import { fetchExportTrainingSession } from "./_lib/data"
import { formatDateForFile, formatDateTime } from "./_lib/format"
import { buildPdfMetaLines } from "./_lib/meta"
import { buildPdfSections } from "./_lib/sections"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession()
  if (!session) {
    return new NextResponse("Nicht angemeldet", { status: 401 })
  }

  const { id } = await params
  const trainingSession = await fetchExportTrainingSession(id, session.user.id)
  if (!trainingSession) {
    return new NextResponse("Einheit nicht gefunden", { status: 404 })
  }

  const displayName = session.user.name ?? session.user.email ?? "-"
  const metaLines = buildPdfMetaLines(trainingSession, displayName)
  const sections = buildPdfSections(trainingSession)

  const pdf = buildStyledPdf({
    title: "Treffsicher - Einheitenexport",
    subtitle: formatDateTime(trainingSession.date),
    metaLines,
    sections,
  })

  const fileDate = formatDateForFile(trainingSession.date)
  const pdfBytes = new Uint8Array(pdf.length)
  pdfBytes.set(pdf)

  return new NextResponse(pdfBytes.buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="session-${fileDate}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  })
}
