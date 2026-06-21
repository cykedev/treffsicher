import type { FormEventHandler } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { DiscardChangesDialog } from "@/components/app/shell/DiscardChangesDialog"
import { MeytonImportDialog } from "@/components/app/session-form/MeytonImportDialog"
import { SessionFormFooter } from "@/components/app/session-form/SessionFormFooter"
import { SessionGoalsSection } from "@/components/app/session-form/SessionGoalsSection"
import { SessionMainFields } from "@/components/app/session-form/SessionMainFields"
import { SessionSeriesSection } from "@/components/app/session-form/SessionSeriesSection"
import type {
  SessionSeriesActions,
  SessionSeriesModel,
} from "@/components/app/session-form/SessionSeriesSection"
import type { ComponentProps } from "react"

type MainProps = ComponentProps<typeof SessionMainFields>
type GoalsProps = ComponentProps<typeof SessionGoalsSection>
type ImportDialogProps = ComponentProps<typeof MeytonImportDialog>
type FooterProps = ComponentProps<typeof SessionFormFooter>

interface FormHandlers {
  onSubmit: FormEventHandler<HTMLFormElement>
  markDirty: () => void
}

interface SeriesPanel {
  model: SessionSeriesModel
  actions: SessionSeriesActions
}

interface DiscardProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

interface Props {
  form: FormHandlers
  main: MainProps
  goals: GoalsProps
  // null, solange keine Disziplin gewählt ist (Serien noch nicht anzeigbar).
  series: SeriesPanel | null
  importDialog: ImportDialogProps | null
  footer: FooterProps
  discard: DiscardProps
}

// Reines Layout des Session-Formulars. Die gesamte Logik/Datenaufbereitung bleibt in SessionForm.
export function SessionFormBody({
  form,
  main,
  goals,
  series,
  importDialog,
  footer,
  discard,
}: Props) {
  return (
    <form
      onSubmit={form.onSubmit}
      onInput={form.markDirty}
      onChange={form.markDirty}
      noValidate
      className="space-y-6"
    >
      <Card>
        <CardContent className="space-y-4 pt-6">
          <SessionMainFields model={main.model} actions={main.actions} />
          <SessionGoalsSection model={goals.model} actions={goals.actions} />
        </CardContent>
      </Card>

      {/* Serien — erscheinen erst wenn Disziplin gewählt */}
      {series && <SessionSeriesSection model={series.model} actions={series.actions} />}

      {importDialog && (
        <MeytonImportDialog model={importDialog.model} actions={importDialog.actions} />
      )}

      <SessionFormFooter {...footer} />

      <DiscardChangesDialog
        open={discard.open}
        onCancel={discard.onCancel}
        onConfirm={discard.onConfirm}
      />
    </form>
  )
}
