import { EXECUTION_QUALITY_LABELS } from "@/lib/sessions/presentation"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  seriesIndex: number
  defaultExecutionQuality: number | null | undefined
}

export function SeriesQualitySelect({ seriesIndex, defaultExecutionQuality }: Props) {
  return (
    <div className="space-y-1">
      <Label htmlFor={`quality-${seriesIndex}`} className="text-xs text-muted-foreground">
        Ausführung (optional)
      </Label>
      <Select
        name={`series[${seriesIndex}][executionQuality]`}
        defaultValue={defaultExecutionQuality != null ? String(defaultExecutionQuality) : undefined}
      >
        <SelectTrigger id={`quality-${seriesIndex}`} className="h-8 text-xs">
          <SelectValue placeholder="Bewertung wählen" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(EXECUTION_QUALITY_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value} className="text-xs">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
