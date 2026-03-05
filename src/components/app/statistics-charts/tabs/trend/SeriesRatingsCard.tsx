import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { TrendTabModel } from "@/components/app/statistics-charts/tabs/types"

interface Props {
  model: TrendTabModel["seriesRatings"]
}

// Serienkarte blendet sich ohne Daten aus, damit der Trend-Tab nicht mit leeren Charts überladen wird.
export function SeriesRatingsCard({ model }: Props) {
  const { barData, disciplineFilter, seriesChartConfig, seriesYAxis, seriesHasDecimals } = model

  if (barData.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline gap-2">
          Serienwertungen
          {disciplineFilter === "all" && (
            <span className="text-sm font-normal text-muted-foreground">
              (Disziplin wählen für vergleichbare Werte)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={seriesChartConfig} className="h-[240px] w-full">
          <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={seriesYAxis.domain}
              ticks={seriesYAxis.ticks}
              tickFormatter={(value: number) =>
                seriesHasDecimals ? value.toFixed(1).replace(/\.0$/, "") : String(Math.round(value))
              }
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              content={<ChartTooltipContent indicator="line" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="Min" fill="var(--chart-2)" opacity={0.5} />
            <Bar dataKey="Avg" fill="var(--chart-1)" />
            <Bar dataKey="Max" fill="var(--chart-1)" opacity={0.4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
