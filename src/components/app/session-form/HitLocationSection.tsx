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
import type {
  HitLocationSectionActions,
  HitLocationSectionModel,
} from "@/components/app/session-form/types"
import { isValidHitLocationMillimeter } from "@/components/app/session-form/utils"

interface Props {
  model: HitLocationSectionModel
  actions: HitLocationSectionActions
}

export function HitLocationSection({ model, actions }: Props) {
  const { pending, hitLocation, hasValidationError } = model

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm">Trefferlage (optional)</Label>
        {hitLocation ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={actions.clear}
            disabled={pending}
          >
            Trefferlage löschen
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={actions.enable}
            disabled={pending}
          >
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
                onChange={(event) => actions.change("horizontalMm", event.target.value)}
                disabled={pending}
                className={
                  hasValidationError && !isValidHitLocationMillimeter(hitLocation.horizontalMm)
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
                aria-label="Trefferlage horizontal in mm"
              />
              <Select
                value={hitLocation.horizontalDirection || undefined}
                disabled={pending}
                onValueChange={(value) =>
                  actions.change("horizontalDirection", value as HitLocationHorizontalDirection)
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
                onChange={(event) => actions.change("verticalMm", event.target.value)}
                disabled={pending}
                className={
                  hasValidationError && !isValidHitLocationMillimeter(hitLocation.verticalMm)
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
                aria-label="Trefferlage vertikal in mm"
              />
              <Select
                value={hitLocation.verticalDirection || undefined}
                disabled={pending}
                onValueChange={(value) =>
                  actions.change("verticalDirection", value as HitLocationVerticalDirection)
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

      {hasValidationError && (
        <p className="text-xs text-destructive">
          Trefferlage unvollständig oder ungültig. Bitte beide mm-Werte und Richtungen angeben oder
          die Trefferlage löschen.
        </p>
      )}
    </div>
  )
}
