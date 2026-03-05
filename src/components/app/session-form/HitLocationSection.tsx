import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type {
  HitLocationHorizontalDirection,
  HitLocationVerticalDirection,
} from "@/generated/prisma/client"
import type { SessionHitLocation } from "@/components/app/session-form/types"
import { isValidHitLocationMillimeter } from "@/components/app/session-form/utils"

interface Props {
  pending: boolean
  hitLocation: SessionHitLocation | null
  hasHitLocationValidationError: boolean
  onEnable: () => void
  onClear: () => void
  onChange: <K extends keyof SessionHitLocation>(key: K, value: SessionHitLocation[K]) => void
}

export function HitLocationSection({
  pending,
  hitLocation,
  hasHitLocationValidationError,
  onEnable,
  onClear,
  onChange,
}: Props) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm">Trefferlage (optional)</Label>
        {hitLocation ? (
          <Button type="button" variant="outline" size="sm" onClick={onClear} disabled={pending}>
            Trefferlage löschen
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onEnable} disabled={pending}>
            Trefferlage erfassen
          </Button>
        )}
      </div>

      {hitLocation && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Horizontal</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="mm"
                value={hitLocation.horizontalMm}
                onChange={(event) => onChange("horizontalMm", event.target.value)}
                disabled={pending}
                className={
                  hasHitLocationValidationError &&
                  !isValidHitLocationMillimeter(hitLocation.horizontalMm)
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
                aria-label="Trefferlage horizontal in mm"
              />
              <Select
                value={hitLocation.horizontalDirection || undefined}
                disabled={pending}
                onValueChange={(value) =>
                  onChange("horizontalDirection", value as HitLocationHorizontalDirection)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Richtung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEFT">links</SelectItem>
                  <SelectItem value="RIGHT">rechts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Vertikal</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="mm"
                value={hitLocation.verticalMm}
                onChange={(event) => onChange("verticalMm", event.target.value)}
                disabled={pending}
                className={
                  hasHitLocationValidationError &&
                  !isValidHitLocationMillimeter(hitLocation.verticalMm)
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
                aria-label="Trefferlage vertikal in mm"
              />
              <Select
                value={hitLocation.verticalDirection || undefined}
                disabled={pending}
                onValueChange={(value) =>
                  onChange("verticalDirection", value as HitLocationVerticalDirection)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Richtung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">hoch</SelectItem>
                  <SelectItem value="LOW">tief</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {hasHitLocationValidationError && (
        <p className="text-xs text-destructive">
          Trefferlage unvollständig oder ungültig. Bitte beide mm-Werte und Richtungen angeben oder
          die Trefferlage löschen.
        </p>
      )}
    </div>
  )
}
