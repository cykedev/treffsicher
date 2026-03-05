import { Button } from "@/components/ui/button"

interface Props {
  pending: boolean
  submitLabel: string
  submitPendingLabel: string
  onCancel?: () => void
}

export function ActionFormFooter({ pending, submitLabel, submitPendingLabel, onCancel }: Props) {
  return (
    <div className="flex gap-2">
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? submitPendingLabel : submitLabel}
      </Button>
      {onCancel && (
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={pending}>
          Abbrechen
        </Button>
      )}
    </div>
  )
}
