"use client"

import { useTransition, useRef, useState } from "react"
import { uploadAttachment, deleteAttachment } from "@/lib/sessions/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

interface AttachmentData {
  id: string
  filePath: string
  fileType: string
  originalName: string
  label: string | null
}

interface Props {
  sessionId: string
  attachments: AttachmentData[]
}

/**
 * Interaktiver Bereich für Datei-Anhänge einer Einheit.
 * Zeigt bestehende Anhänge (Bildvorschau / PDF-Link) und ermöglicht Upload und Löschung.
 */
export function AttachmentSection({ sessionId, attachments }: Props) {
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<AttachmentData | null>(null)

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setMessage(null)

    startTransition(async () => {
      const result = await uploadAttachment(sessionId, formData)
      if (result.error) {
        setMessage(result.error)
      } else {
        // Dateiauswahl zurücksetzen
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    })
  }

  function handleDeleteConfirmed(): void {
    if (!deleteCandidate) return
    setMessage(null)
    startTransition(async () => {
      const result = await deleteAttachment(deleteCandidate.id)
      if (result.error) {
        setMessage(result.error)
      }
      setDeleteCandidate(null)
    })
  }

  return (
    <div className="space-y-4">
      {message && <p className="text-sm text-destructive">{message}</p>}

      {/* Bestehende Anhänge */}
      {attachments.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {attachments.map((attachment) => (
            <Card key={attachment.id}>
              <CardContent className="p-3 space-y-2">
                {attachment.fileType === "IMAGE" ? (
                  // Bildvorschau — Klick öffnet Vollbild in neuem Tab
                  <a
                    href={`/api/uploads/${attachment.filePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/uploads/${attachment.filePath}`}
                      alt={attachment.originalName}
                      className="w-full rounded object-cover"
                      style={{ maxHeight: "160px" }}
                    />
                  </a>
                ) : (
                  // PDF-Link
                  <a
                    href={`/api/uploads/${attachment.filePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded border p-3 text-sm hover:bg-muted"
                  >
                    <span>PDF</span>
                    <span className="truncate text-muted-foreground">
                      {attachment.originalName}
                    </span>
                  </a>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">
                    {attachment.label ?? attachment.originalName}
                  </span>
                  <Button
                    variant="destructive"
                    size="xs"
                    className="h-7 shrink-0"
                    disabled={isPending}
                    onClick={() => setDeleteCandidate(attachment)}
                  >
                    Löschen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload-Formular */}
      <form onSubmit={handleUpload} className="space-y-1">
        <Label htmlFor="file" className="text-sm">
          Datei anhängen
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            ref={fileInputRef}
            id="file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            disabled={isPending}
            className="flex-1"
          />
          <Button type="submit" disabled={isPending} variant="outline" size="sm" className="shrink-0">
            {isPending ? "Wird hochgeladen..." : "Hochladen"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">JPEG, PNG, WebP oder PDF — max. 10 MB</p>
      </form>

      <AlertDialog
        open={deleteCandidate !== null}
        onOpenChange={(open) => !open && setDeleteCandidate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anhang löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCandidate
                ? `"${deleteCandidate.originalName}" wird dauerhaft entfernt.`
                : "Der Anhang wird dauerhaft entfernt."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteConfirmed}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
