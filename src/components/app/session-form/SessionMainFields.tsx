import type { Discipline } from "@/generated/prisma/client"
import { needsDisciplineForSessionType, SESSION_TYPE_LABELS } from "@/lib/sessions/presentation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { HitLocationSection } from "@/components/app/session-form/HitLocationSection"
import type {
  HitLocationSectionActions,
  HitLocationSectionModel,
  SessionHitLocation,
} from "@/components/app/session-form/types"

interface Model {
  type: string
  dateValue: string
  disciplineId: string
  disciplines: Discipline[]
  pending: boolean
  hitLocation: SessionHitLocation | null
  hasHitLocationValidationError: boolean
  initialLocation: string
  initialTrainingGoal: string
}

interface Actions {
  typeChange: (value: string) => void
  dateChange: (value: string) => void
  disciplineChange: (value: string) => void
  hitLocation: HitLocationSectionActions
}

interface Props {
  model: Model
  actions: Actions
}

export function SessionMainFields({ model, actions }: Props) {
  const {
    type,
    dateValue,
    disciplineId,
    disciplines,
    pending,
    hitLocation,
    hasHitLocationValidationError,
    initialLocation,
    initialTrainingGoal,
  } = model

  const needsDiscipline = needsDisciplineForSessionType(type)
  const showTrainingGoal = type !== "" && type !== "WETTKAMPF"

  const hitLocationModel: HitLocationSectionModel = {
    pending,
    hitLocation,
    hasValidationError: hasHitLocationValidationError,
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
        <div className="space-y-2">
          <Label htmlFor="type">Art der Einheit</Label>
          <Select name="type" required value={type} onValueChange={actions.typeChange}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Typ wählen" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Datum & Uhrzeit</Label>
          <Input
            id="date"
            name="date"
            type="datetime-local"
            required
            value={dateValue}
            onChange={(event) => actions.dateChange(event.target.value)}
            disabled={pending}
          />
        </div>
      </div>

      {needsDiscipline && (
        <div className="space-y-2">
          <Label htmlFor="disciplineId">Disziplin</Label>
          <Select
            name="disciplineId"
            required={needsDiscipline}
            value={disciplineId}
            onValueChange={actions.disciplineChange}
          >
            <SelectTrigger id="disciplineId">
              <SelectValue placeholder="Disziplin wählen" />
            </SelectTrigger>
            <SelectContent>
              {disciplines.map((discipline) => (
                <SelectItem key={discipline.id} value={discipline.id}>
                  {discipline.name}
                  {discipline.isSystem && " (Standard)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {needsDiscipline && (
        <HitLocationSection model={hitLocationModel} actions={actions.hitLocation} />
      )}

      <input type="hidden" name="hitLocationHorizontalMm" value={hitLocation?.horizontalMm ?? ""} />
      <input
        type="hidden"
        name="hitLocationHorizontalDirection"
        value={hitLocation?.horizontalDirection ?? ""}
      />
      <input type="hidden" name="hitLocationVerticalMm" value={hitLocation?.verticalMm ?? ""} />
      <input
        type="hidden"
        name="hitLocationVerticalDirection"
        value={hitLocation?.verticalDirection ?? ""}
      />

      <div className="space-y-2">
        <Label htmlFor="location">Ort (optional)</Label>
        <Input
          id="location"
          name="location"
          placeholder="z.B. Schützenhaus Muster"
          defaultValue={initialLocation}
          disabled={pending}
        />
      </div>

      {showTrainingGoal && (
        <div className="space-y-2">
          <Label htmlFor="trainingGoal">Trainingsziel (optional)</Label>
          <Textarea
            id="trainingGoal"
            name="trainingGoal"
            placeholder="Was soll heute gelingen?"
            defaultValue={initialTrainingGoal}
            disabled={pending}
            rows={2}
          />
        </div>
      )}
    </>
  )
}
