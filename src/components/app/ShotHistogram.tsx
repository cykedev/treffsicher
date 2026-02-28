"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts"

interface ShotHistogramProps {
  shots: string[]     // Schüsse aus Wertungsserien — Probeschüsse werden nicht dargestellt
  isDecimal: boolean  // TENTH-Wertung: Schusswerte flooren (9.5 → Bucket „9")
}

// Farbschema analog zu Meyton-Schiessständen:
// 10 → rot, 9 → gelb, 8–0 → Grautöne (8 dunkelst, 0 hellst)
// Index 0 im Array entspricht Bucket 10 (links), Index 10 = Bucket 0 (rechts)
const BUCKET_COLORS = [
  "#ef4444", // 10 — rot
  "#eab308", // 9 — gelb
  "#374151", // 8 — dunkelgrau (grey-700)
  "#52606d", // 7
  "#6b7280", // 6 — grey-500
  "#8896a0", // 5
  "#9ca3af", // 4 — grey-400
  "#b5bec8", // 3
  "#c8d1da", // 2
  "#dae1e8", // 1
  "#edf1f5", // 0 — sehr hellgrau
]

interface BucketData {
  ring: number
  count: number
  label: string
}

/**
 * Schüsse einer Einheit in Ring-Buckets zählen.
 * Bei Zehntelwertung wird auf den nächsttieferen ganzen Ring gefloort.
 */
function bucketize(shots: string[], isDecimal: boolean): number[] {
  const counts = new Array(11).fill(0)
  for (const shot of shots) {
    const value = parseFloat(shot)
    if (isNaN(value)) continue
    const bucket = isDecimal ? Math.floor(value) : Math.round(value)
    counts[Math.max(0, Math.min(10, bucket))]++
  }
  return counts
}

/**
 * Schuss-Histogramm für eine Einheit.
 * Zeigt nur Wertungsschüsse — Probeschüsse sind nicht Teil der Auswertung.
 * Ringwert 10 links, 0 rechts — alle 11 Buckets immer sichtbar.
 */
export function ShotHistogram({ shots, isDecimal }: ShotHistogramProps) {
  const counts = bucketize(shots, isDecimal)

  // Daten absteigend (10 links, 0 rechts) — beste Werte links
  const data: BucketData[] = Array.from({ length: 11 }, (_, i) => {
    const ring = 10 - i
    return {
      ring,
      count: counts[ring],
      label: String(ring),
    }
  })

  const total = shots.length

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{total} Schüsse</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            formatter={(value: number) => {
              if (value === 0) return [null, null]
              return [`${value} Schüsse`, "Wertung"]
            }}
            labelFormatter={(label) => `Ring ${label}`}
          />
          <Bar dataKey="count">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${entry.ring}`}
                fill={BUCKET_COLORS[index]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
