interface Props {
  error?: string
  success?: boolean
  showInlineSuccess: boolean
  successMessage: string
}

export function ActionFormMessages({ error, success, showInlineSuccess, successMessage }: Props) {
  return (
    <>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && showInlineSuccess && <p className="text-sm text-green-600">{successMessage}</p>}
    </>
  )
}
