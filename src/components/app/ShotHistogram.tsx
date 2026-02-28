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
  shots: string[]
  // TENTH-Wertung: Schusswerte flooren (9.5 und 9.1 → Bucket "9")
  isDecimal: boolean
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
 * Schuss-Histogramm für eine Einheit.
 * Zeigt die Anzahl der Treffer pro Ringwert (0–10), von 10 (links) bis 0 (rechts).
 * Bei Zehntelwertung werden Schusswerte auf den nächsttieferen ganzen Ring gefloort.
 */
export function ShotHistogram({ shots, isDecimal }: ShotHistogramProps) {
  // Buckets 0–10 initialisieren — immer alle 11 Buckets, auch wenn leer
  const counts = new Array(11).fill(0)

  for (const shot of shots) {
    const value = parseFloat(shot)
    if (isNaN(value)) continue

    // Bei Zehntelwertung auf ganzen Ring flooren, bei Ganzring runden
    const bucket = isDecimal ? Math.floor(value) : Math.round(value)
    // Auf gültigen Bereich clampen
    const clamped = Math.max(0, Math.min(10, bucket))
    counts[clamped]++
  }

  // Daten absteigend (10 links, 0 rechts) — so sind die besten Werte links
  const data: BucketData[] = Array.from({ length: 11 }, (_, i) => {
    const ring = 10 - i
    return {
      ring,
      count: counts[ring],
      label: String(ring),
    }
  })

  const totalShots = shots.length

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{totalShots} Schüsse</p>
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
            formatter={(value: number) => [`${value} Schüsse`, "Anzahl"]}
            labelFormatter={(label) => `Ring ${label}`}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${entry.ring}`}
                fill={BUCKET_COLORS[index]}
                opacity={entry.count === 0 ? 0.2 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
