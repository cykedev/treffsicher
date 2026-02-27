"use client"

import { useTransition, useRef } from "react"
import { uploadAttachment, deleteAttachment } from "@/lib/sessions/actions"
import { Button } from "@/components/ui/button"
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

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await uploadAttachment(sessionId, formData)
      if (result.error) {
        alert(result.error)
      } else {
        // Dateiauswahl zurücksetzen
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    })
  }

  function handleDelete(attachmentId: string, originalName: string) {
    if (!confirm(`"${originalName}" wirklich löschen?`)) return

    startTransition(async () => {
      const result = await deleteAttachment(attachmentId)
      if (result.error) {
        alert(result.error)
      }
    })
  }

  return (
    <div className="space-y-4">
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
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 text-xs text-destructive hover:text-destructive"
                    disabled={isPending}
                    onClick={() => handleDelete(attachment.id, attachment.originalName)}
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
      <form onSubmit={handleUpload} className="flex items-end gap-3">
        <div className="space-y-1 flex-1">
          <Label htmlFor="file" className="text-sm">
            Datei anhängen
          </Label>
          <input
            ref={fileInputRef}
            id="file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            disabled={isPending}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted/80"
          />
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP oder PDF — max. 10 MB</p>
        </div>
        <Button type="submit" disabled={isPending} variant="outline" size="sm">
          {isPending ? "Wird hochgeladen..." : "Hochladen"}
        </Button>
      </form>
    </div>
  )
}
