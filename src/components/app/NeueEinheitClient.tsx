"use client"

import { useState } from "react"
import { EinheitForm } from "@/components/app/EinheitForm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { importMeytonPdf } from "@/lib/sessions/actions"
import type { MeytonImportPrefill } from "@/lib/sessions/actions"
import type { Discipline } from "@/generated/prisma/client"

interface Props {
  disciplines: Discipline[]
}

type ImportType = "TRAINING" | "WETTKAMPF"
type SourceType = "URL" | "UPLOAD"

const importTypeLabels: Record<ImportType, string> = {
  TRAINING: "Training",
  WETTKAMPF: "Wettkampf",
}

export function NeueEinheitClient({ disciplines }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportPending, setIsImportPending] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [prefillData, setPrefillData] = useState<MeytonImportPrefill | undefined>(undefined)
  const [formKey, setFormKey] = useState(0)

  const [importType, setImportType] = useState<ImportType>("TRAINING")
  const [disciplineId, setDisciplineId] = useState<string>(() => disciplines[0]?.id ?? "")
  const [sourceType, setSourceType] = useState<SourceType>("URL")

  function openDialog(): void {
    setImportError(null)
    setIsDialogOpen(true)
  }

  function closeDialog(): void {
    if (isImportPending) return
    setIsDialogOpen(false)
  }

  async function handleImportSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setImportError(null)
    setIsImportPending(true)

    const formData = new FormData(event.currentTarget)
    const result = await importMeytonPdf(formData)

    if (result.error || !result.data) {
      setImportError(result.error ?? "Import fehlgeschlagen.")
      setIsImportPending(false)
      return
    }

    setPrefillData(result.data)
    setFormKey((value) => value + 1)
    setIsImportPending(false)
    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={openDialog}>
          Meyton-PDF importieren
        </Button>
        {prefillData && (
          <p className="text-sm text-muted-foreground">
            Import abgeschlossen. Formular wurde mit Serien und Schuessen befuellt.
          </p>
        )}
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-xl">
            <CardHeader className="space-y-1">
              <CardTitle>Meyton-Import</CardTitle>
              <p className="text-sm text-muted-foreground">
                Modus und Disziplin waehlen, dann PDF per URL oder Upload einlesen.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleImportSubmit} className="space-y-4">
                <input type="hidden" name="type" value={importType} />
                <input type="hidden" name="disciplineId" value={disciplineId} />
                <input type="hidden" name="source" value={sourceType} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="meyton-type">Modus</Label>
                    <Select
                      value={importType}
                      onValueChange={(value) => setImportType(value as ImportType)}
                    >
                      <SelectTrigger id="meyton-type" className="w-full">
                        <SelectValue placeholder="Modus waehlen" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(importTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meyton-discipline">Disziplin</Label>
                    <Select value={disciplineId} onValueChange={setDisciplineId}>
                      <SelectTrigger id="meyton-discipline" className="w-full">
                        <SelectValue placeholder="Disziplin waehlen" />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplines.map((discipline) => (
                          <SelectItem key={discipline.id} value={discipline.id}>
                            {discipline.name}
                            {discipline.isSystem ? " (Standard)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meyton-source">Quelle</Label>
                  <Select
                    value={sourceType}
                    onValueChange={(value) => setSourceType(value as SourceType)}
                  >
                    <SelectTrigger id="meyton-source" className="w-full">
                      <SelectValue placeholder="Quelle waehlen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="URL">PDF-URL</SelectItem>
                      <SelectItem value="UPLOAD">PDF-Upload</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {sourceType === "URL" ? (
                  <div className="space-y-2">
                    <Label htmlFor="pdfUrl">PDF-URL</Label>
                    <Input
                      id="pdfUrl"
                      name="pdfUrl"
                      type="url"
                      placeholder="http://example.com/meyton.pdf"
                      required
                      disabled={isImportPending}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="file">PDF-Datei</Label>
                    <Input
                      id="file"
                      name="file"
                      type="file"
                      accept="application/pdf,.pdf"
                      required
                      disabled={isImportPending}
                    />
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Alle importierten Serien werden als Wertungsserien angelegt. Bei
                  Ganzring-Disziplinen werden Zehntelwerte per Floor konvertiert.
                </p>

                {importError && <p className="text-sm text-destructive">{importError}</p>}

                <div className="flex gap-2">
                  <Button type="submit" disabled={isImportPending || !disciplineId}>
                    {isImportPending ? "Importiere..." : "Importieren"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDialog}
                    disabled={isImportPending}
                  >
                    Abbrechen
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <EinheitForm key={formKey} disciplines={disciplines} prefillData={prefillData} />
    </div>
  )
}
