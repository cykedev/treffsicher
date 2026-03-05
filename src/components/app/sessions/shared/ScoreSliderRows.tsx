import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

export interface ScoreSliderRow<Key extends string> {
  id: string
  name: Key
  label: string
}

interface Props<Key extends string> {
  title: string
  rows: ReadonlyArray<ScoreSliderRow<Key>>
  values: Record<Key, number>
  pending: boolean
  onValueChange: (name: Key, value: number) => void
}

export function ScoreSliderRows<Key extends string>({
  title,
  rows,
  values,
  pending,
  onValueChange,
}: Props<Key>) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{title}</p>
      {rows.map((row) => {
        const value = values[row.name]
        return (
          <div key={row.name} className="flex items-center gap-3">
            <Label htmlFor={row.id} className="w-32 shrink-0 truncate text-sm">
              {row.label}
            </Label>
            <input type="hidden" name={row.name} value={value} />
            <Slider
              id={row.id}
              min={0}
              max={100}
              step={1}
              value={[value]}
              onValueChange={([nextValue]) => onValueChange(row.name, nextValue)}
              disabled={pending}
              className="flex-1"
            />
            <span className="w-8 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
              {value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
