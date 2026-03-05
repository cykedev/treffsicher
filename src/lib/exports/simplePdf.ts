import { renderDocumentPages } from "@/lib/exports/simple-pdf/documentPages"
import { serializePdfPages } from "@/lib/exports/simple-pdf/pdfSerializer"
import type { StyledPdfDocument } from "@/lib/exports/simple-pdf/types"

export type {
  PdfChart,
  PdfChartBarItem,
  PdfChartHistogramBucket,
  PdfChartSeriesRow,
  PdfSection,
  StyledPdfDocument,
} from "@/lib/exports/simple-pdf/types"

export function buildStyledPdf(document: StyledPdfDocument): Uint8Array {
  const pages = renderDocumentPages(document)
  return serializePdfPages(pages)
}
