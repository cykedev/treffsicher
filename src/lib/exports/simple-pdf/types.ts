export type PdfChartBarItem = {
  label: string
  value: number
  colorHex?: string
  displayValue?: string
}

export type PdfChartHistogramBucket = {
  label: string
  value: number
  colorHex?: string
}

export type PdfChartSeriesRow = {
  label: string
  score: string
  shots: string
}

export type PdfChart =
  | {
      type: "bars"
      title?: string
      maxValue?: number
      items: PdfChartBarItem[]
    }
  | {
      type: "histogram"
      title?: string
      buckets: PdfChartHistogramBucket[]
    }
  | {
      type: "seriesGrid"
      title?: string
      rows: PdfChartSeriesRow[]
    }
  | {
      type: "hitLocation"
      title?: string
      horizontalMm: number
      horizontalDirection: "LEFT" | "RIGHT"
      verticalMm: number
      verticalDirection: "HIGH" | "LOW"
      maxMm?: number
    }

export type PdfSection = {
  title: string
  lines: string[]
  icon?: string
  charts?: PdfChart[]
}

export type StyledPdfDocument = {
  title: string
  subtitle?: string
  metaLines?: string[]
  sections: PdfSection[]
}

export type FieldRow = {
  kind: "field"
  labelLines: string[]
  valueLines: string[]
  indent: number
  labelWidth: number
  height: number
}

export type TextRow = {
  kind: "text"
  textLines: string[]
  indent: number
  height: number
}

export type RenderRow = FieldRow | TextRow

export type AddPdfCommand = (command: string) => void
