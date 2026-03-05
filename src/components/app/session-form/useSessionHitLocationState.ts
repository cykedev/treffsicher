import { useCallback, useMemo, useState } from "react"
import type { MeytonImportPreviewHitLocation, SessionDetail } from "@/lib/sessions/actions"
import type { SessionHitLocation } from "@/components/app/session-form/types"
import {
  formatMillimeters,
  isValidHitLocationMillimeter,
} from "@/components/app/session-form/utils"

interface Params {
  initialData?: SessionDetail
}

function toInitialHitLocation(initialData?: SessionDetail): SessionHitLocation | null {
  if (
    !initialData ||
    initialData.hitLocationHorizontalMm === null ||
    initialData.hitLocationHorizontalDirection === null ||
    initialData.hitLocationVerticalMm === null ||
    initialData.hitLocationVerticalDirection === null
  ) {
    return null
  }

  return {
    horizontalMm: formatMillimeters(initialData.hitLocationHorizontalMm),
    horizontalDirection: initialData.hitLocationHorizontalDirection,
    verticalMm: formatMillimeters(initialData.hitLocationVerticalMm),
    verticalDirection: initialData.hitLocationVerticalDirection,
  }
}

export function useSessionHitLocationState({ initialData }: Params) {
  const [hitLocation, setHitLocation] = useState<SessionHitLocation | null>(() =>
    toInitialHitLocation(initialData)
  )

  const isHitLocationComplete = useMemo(() => {
    return (
      hitLocation !== null &&
      isValidHitLocationMillimeter(hitLocation.horizontalMm) &&
      hitLocation.horizontalDirection !== "" &&
      isValidHitLocationMillimeter(hitLocation.verticalMm) &&
      hitLocation.verticalDirection !== ""
    )
  }, [hitLocation])

  const hasAnyHitLocationInput = useMemo(() => {
    return (
      hitLocation !== null &&
      (hitLocation.horizontalMm.trim() !== "" ||
        hitLocation.horizontalDirection !== "" ||
        hitLocation.verticalMm.trim() !== "" ||
        hitLocation.verticalDirection !== "")
    )
  }, [hitLocation])

  // Fehler wird erst nach sichtbarer Eingabe signalisiert, damit leere optionale Felder nicht als invalid gelten.
  const hasHitLocationValidationError = hasAnyHitLocationInput && !isHitLocationComplete

  const handleEnableHitLocation = useCallback(() => {
    setHitLocation({
      horizontalMm: "",
      horizontalDirection: "",
      verticalMm: "",
      verticalDirection: "",
    })
  }, [])

  const handleClearHitLocation = useCallback(() => {
    setHitLocation(null)
  }, [])

  const handleHitLocationChange = useCallback(
    <K extends keyof SessionHitLocation>(key: K, value: SessionHitLocation[K]) => {
      setHitLocation((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          [key]: value,
        }
      })
    },
    []
  )

  const applyImportedHitLocation = useCallback(
    (imported: MeytonImportPreviewHitLocation | null) => {
      if (!imported) {
        setHitLocation(null)
        return
      }

      setHitLocation({
        horizontalMm: formatMillimeters(imported.horizontalMm),
        horizontalDirection: imported.horizontalDirection,
        verticalMm: formatMillimeters(imported.verticalMm),
        verticalDirection: imported.verticalDirection,
      })
    },
    []
  )

  return {
    hitLocation,
    isHitLocationComplete,
    hasHitLocationValidationError,
    handleEnableHitLocation,
    handleClearHitLocation,
    handleHitLocationChange,
    applyImportedHitLocation,
  }
}
