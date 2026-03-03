"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

type Props = {
  href: string
  label: string
  className?: string
}

// Einheitlicher "Neu/Anlegen"-Button für Listen-Seiten.
// Warum zentralisieren: gleiche Position, Icon-Abstand und mobile Breite
// sorgen für ein konsistentes Bedienmuster über alle Bereiche.
export function CreateItemLinkButton({ href, label, className }: Props) {
  return (
    <Button asChild className={className ?? "w-full sm:w-auto"}>
      <Link href={href}>
        <Plus className="mr-1.5 h-4 w-4" />
        {label}
      </Link>
    </Button>
  )
}
