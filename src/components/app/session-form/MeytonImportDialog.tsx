import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  ImportSourceType,
  MeytonImportDialogActions,
  MeytonImportDialogModel,
} from "@/components/app/session-form/types"

interface Props {
  model: MeytonImportDialogModel
  actions: MeytonImportDialogActions
}

export function MeytonImportDialog({ model, actions }: Props) {
  const { open, isPending, source, url, file, error } = model
  const importFileInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <Dialog open={open} onOpenChange={actions.openChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Meyton-Import</DialogTitle>
          <DialogDescription>
            Die importierten Daten ersetzen alle aktuellen Serien in dieser Einheit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meyton-source">Quelle</Label>
            <Select
              value={source}
              onValueChange={(value) => actions.sourceChange(value as ImportSourceType)}
            >
              <SelectTrigger id="meyton-source" className="w-full">
                <SelectValue placeholder="Quelle wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="URL">PDF-URL</SelectItem>
                <SelectItem value="UPLOAD">PDF-Upload</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {source === "URL" ? (
            <div className="space-y-2">
              <Label htmlFor="pdfUrl">PDF-URL</Label>
              <Input
                key="meyton-url-input"
                id="pdfUrl"
                type="url"
                placeholder="example.com/meyton.pdf"
                value={url}
                onChange={(event) => actions.urlChange(event.target.value)}
                disabled={isPending}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="meyton-file">PDF-Datei</Label>
              <input
                ref={importFileInputRef}
                id="meyton-file"
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onClick={(event) => {
                  // Gleiches File erneut wählbar halten, damit "Importieren" nach Korrekturen nicht stumm ausfällt.
                  event.currentTarget.value = ""
                }}
                onChange={(event) => actions.fileChange(event.target.files?.[0] ?? null)}
                disabled={isPending}
              />
              <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2.5 py-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => importFileInputRef.current?.click()}
                  className="shrink-0"
                >
                  Datei auswählen
                </Button>
                {file && (
                  <span className="min-w-0 truncate text-sm text-foreground">{file.name}</span>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => {
              void actions.runImport()
            }}
          >
            {isPending ? "Importiere..." : "Importieren"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => actions.openChange(false)}
          >
            Abbrechen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
