"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TypeOption = {
  value: string
  label: string
}

type DisciplineOption = {
  id: string
  name: string
}

interface Props {
  typeOptions: TypeOption[]
  disciplineOptions: DisciplineOption[]
  selectedType: string
  selectedDiscipline: string
}

export function EinheitenFilters({
  typeOptions,
  disciplineOptions,
  selectedType,
  selectedDiscipline,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const hasActiveFilters = selectedType !== "all" || selectedDiscipline !== "all"

  function updateFilters(nextType: string, nextDiscipline: string): void {
    const params = new URLSearchParams(searchParams.toString())

    if (nextType === "all") params.delete("type")
    else params.set("type", nextType)

    if (nextDiscipline === "all") params.delete("discipline")
    else params.set("discipline", nextDiscipline)

    const query = params.toString()
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  function resetFilters(): void {
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={selectedType}
        onValueChange={(value) => updateFilters(value, selectedDiscipline)}
        disabled={isPending}
      >
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue placeholder="Alle Typen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Typen</SelectItem>
          {typeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedDiscipline}
        onValueChange={(value) => updateFilters(selectedType, value)}
        disabled={isPending}
      >
        <SelectTrigger className="h-9 w-[200px] sm:w-[220px]">
          <SelectValue placeholder="Alle Disziplinen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Disziplinen</SelectItem>
          {disciplineOptions.map((discipline) => (
            <SelectItem key={discipline.id} value={discipline.id}>
              {discipline.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Filter zurücksetzen"
          onClick={resetFilters}
          disabled={isPending}
          className="h-9 w-9"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

