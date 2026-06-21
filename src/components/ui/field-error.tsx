interface Props {
  // Eindeutige id, passend zum aria-describedby des zugehörigen Inputs.
  id: string
  // Fehlermeldung; bei undefined wird nichts gerendert.
  message?: string
}

// Einheitliche Darstellung eines Feldfehlers unter einem Formularfeld.
export function FieldError({ id, message }: Props) {
  if (!message) return null
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  )
}
