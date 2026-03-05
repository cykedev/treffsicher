import type { RadarLegendItem } from "@/components/app/statistics-charts/types"

interface Props {
  items: RadarLegendItem[]
}

export function RadarLegend({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
      {items.map((item) => (
        <div key={item.key} className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
