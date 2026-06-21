"use client"

import { ConfirmDialog } from "@/components/app/shell/ConfirmDialog"

interface Props {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

// Einheitlicher Verwerfen-Dialog für den Dirty-Guard von Langformularen.
// Bündelt die festen deutschen Texte, damit jedes Formular denselben Wortlaut nutzt.
export function DiscardChangesDialog({ open, onCancel, onConfirm }: Props) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onCancel()}
      title="Ungespeicherte Änderungen verwerfen?"
      description="Es gibt nicht gespeicherte Änderungen. Beim Verlassen gehen sie verloren."
      confirmLabel="Verwerfen"
      destructive
      onConfirm={onConfirm}
    />
  )
}
