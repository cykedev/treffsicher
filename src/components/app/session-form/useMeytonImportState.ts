import { useCallback, useEffect, useState } from "react"
import { previewMeytonImport, type MeytonImportPreview } from "@/lib/sessions/actions"
import type {
  ImportSourceType,
  MeytonImportDialogActions,
  MeytonImportDialogModel,
} from "@/components/app/session-form/types"
import { isPdfFile } from "@/components/app/session-form/utils"

interface Params {
  disciplineId: string
  pending: boolean
  canAcceptDroppedMeytonPdf: boolean
  canAutoSelectDropDefaults: boolean
  defaultDropDisciplineId: string | null
  hasSelectedDiscipline: boolean
  onEnsureDropType: () => void
  onPrepareDropDefaults: (disciplineId: string) => void
  onImportApplied: (preview: MeytonImportPreview) => void
}

export function useMeytonImportState({
  disciplineId,
  pending,
  canAcceptDroppedMeytonPdf,
  canAutoSelectDropDefaults,
  defaultDropDisciplineId,
  hasSelectedDiscipline,
  onEnsureDropType,
  onPrepareDropDefaults,
  onImportApplied,
}: Params): {
  isImportPending: boolean
  openImportDialog: () => void
  dialogModel: MeytonImportDialogModel
  dialogActions: MeytonImportDialogActions
} {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isImportPending, setIsImportPending] = useState(false)
  const [importSource, setImportSource] = useState<ImportSourceType>("URL")
  const [importError, setImportError] = useState<string | null>(null)
  const [importUrl, setImportUrl] = useState("")
  const [importFile, setImportFile] = useState<File | null>(null)

  const handleImportSourceChange = useCallback((value: ImportSourceType) => {
    setImportSource(value)
    setImportError(null)
    setImportUrl("")
    setImportFile(null)
  }, [])

  const openImportDialog = useCallback(() => {
    setImportError(null)
    setImportUrl("")
    setImportFile(null)
    setIsImportDialogOpen(true)
  }, [])

  useEffect(() => {
    if (!canAcceptDroppedMeytonPdf || pending || isImportPending) return

    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files")

    const handleWindowDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy"
      }
    }

    const handleWindowDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()

      const files = Array.from(event.dataTransfer?.files ?? [])
      if (files.length === 0) return

      const pdfFile = files.find((file) => isPdfFile(file))
      if (pdfFile && canAutoSelectDropDefaults) {
        // Beim Datei-Drop soll der Nutzer nicht am fehlenden Typ/Disziplin-Setup
        // scheitern, damit der "schnelle Import" auch im Neu-Formular funktioniert.
        onEnsureDropType()
        if (!hasSelectedDiscipline && defaultDropDisciplineId) {
          onPrepareDropDefaults(defaultDropDisciplineId)
        }
      }

      setImportSource("UPLOAD")
      setImportUrl("")
      setImportFile(pdfFile ?? null)
      setImportError(pdfFile ? null : "Bitte eine PDF-Datei (.pdf) ziehen.")
      setIsImportDialogOpen(true)
    }

    window.addEventListener("dragover", handleWindowDragOver)
    window.addEventListener("drop", handleWindowDrop)

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver)
      window.removeEventListener("drop", handleWindowDrop)
    }
  }, [
    canAcceptDroppedMeytonPdf,
    canAutoSelectDropDefaults,
    defaultDropDisciplineId,
    hasSelectedDiscipline,
    isImportPending,
    onEnsureDropType,
    onPrepareDropDefaults,
    pending,
  ])

  const handleMeytonImport = useCallback(async () => {
    if (canAutoSelectDropDefaults) {
      onEnsureDropType()
    }

    // Die Server-Action braucht zwingend disciplineId, weil die Schuesse bereits
    // beim Import auf WHOLE/TENTH konvertiert werden.
    const resolvedDisciplineId =
      disciplineId || (canAutoSelectDropDefaults ? (defaultDropDisciplineId ?? "") : "")

    if (!resolvedDisciplineId) {
      setImportError("Bitte zuerst eine Disziplin wählen.")
      return
    }

    if (!disciplineId && canAutoSelectDropDefaults && defaultDropDisciplineId) {
      onPrepareDropDefaults(defaultDropDisciplineId)
    }

    const formData = new FormData()
    formData.set("disciplineId", resolvedDisciplineId)
    formData.set("source", importSource)

    if (importSource === "URL") {
      const trimmedUrl = importUrl.trim()
      if (!trimmedUrl) {
        setImportError("Bitte eine PDF-URL angeben.")
        return
      }
      formData.set("pdfUrl", trimmedUrl)
    } else {
      if (!importFile) {
        setImportError("Bitte eine PDF-Datei hochladen.")
        return
      }
      formData.set("file", importFile)
    }

    setImportError(null)
    setIsImportPending(true)

    try {
      const result = await previewMeytonImport(formData)
      if (result.error || !result.data) {
        setImportError(result.error ?? "Import fehlgeschlagen.")
        return
      }

      onImportApplied(result.data)

      setImportUrl("")
      setImportFile(null)
      setIsImportDialogOpen(false)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import fehlgeschlagen.")
    } finally {
      setIsImportPending(false)
    }
  }, [
    canAutoSelectDropDefaults,
    defaultDropDisciplineId,
    disciplineId,
    importFile,
    importSource,
    importUrl,
    onImportApplied,
    onEnsureDropType,
    onPrepareDropDefaults,
  ])

  return {
    isImportPending,
    openImportDialog,
    dialogModel: {
      open: isImportDialogOpen,
      isPending: isImportPending,
      source: importSource,
      url: importUrl,
      file: importFile,
      error: importError,
    },
    dialogActions: {
      openChange: setIsImportDialogOpen,
      sourceChange: handleImportSourceChange,
      urlChange: setImportUrl,
      fileChange: setImportFile,
      runImport: handleMeytonImport,
    },
  }
}
