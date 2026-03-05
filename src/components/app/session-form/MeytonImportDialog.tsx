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
import type { ImportSourceType } from "@/components/app/session-form/types"

interface Props {
  open: boolean
  isImportPending: boolean
  importSource: ImportSourceType
  importUrl: string
  importFile: File | null
  importError: string | null
  onOpenChange: (open: boolean) => void
  onImportSourceChange: (value: ImportSourceType) => void
  onImportUrlChange: (value: string) => void
  onImportFileChange: (file: File | null) => void
  onImport: () => void
}

export function MeytonImportDialog({
  open,
  isImportPending,
  importSource,
  importUrl,
  importFile,
  importError,
  onOpenChange,
  onImportSourceChange,
  onImportUrlChange,
  onImportFileChange,
  onImport,
}: Props) {
  const importFileInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              value={importSource}
              onValueChange={(value) => onImportSourceChange(value as ImportSourceType)}
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

          {importSource === "URL" ? (
            <div className="space-y-2">
              <Label htmlFor="pdfUrl">PDF-URL</Label>
              <Input
                key="meyton-url-input"
                id="pdfUrl"
                type="url"
                placeholder="example.com/meyton.pdf"
                value={importUrl}
                onChange={(event) => onImportUrlChange(event.target.value)}
                disabled={isImportPending}
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
                  event.currentTarget.value = ""
                }}
                onChange={(event) => onImportFileChange(event.target.files?.[0] ?? null)}
                disabled={isImportPending}
              />
              <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2.5 py-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isImportPending}
                  onClick={() => importFileInputRef.current?.click()}
                  className="shrink-0"
                >
                  Datei auswählen
                </Button>
                {importFile && (
                  <span className="min-w-0 truncate text-sm text-foreground">
                    {importFile.name}
                  </span>
                )}
              </div>
            </div>
          )}

          {importError && <p className="text-sm text-destructive">{importError}</p>}
        </div>

        <DialogFooter>
          <Button type="button" disabled={isImportPending} onClick={onImport}>
            {isImportPending ? "Importiere..." : "Importieren"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isImportPending}
            onClick={() => onOpenChange(false)}
          >
            Abbrechen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
