import Link from "next/link"
import { Pencil } from "lucide-react"
import type { AdminUserListItem } from "@/lib/admin/actions"
import { Button } from "@/components/ui/button"

interface Props {
  user: AdminUserListItem
  isSelf: boolean
  pending: boolean
  onToggleActive: (user: AdminUserListItem, nextIsActive: boolean) => void
  layout: "row" | "column"
}

export function AdminUserActionButtons({ user, isSelf, pending, onToggleActive, layout }: Props) {
  return (
    <div
      className={layout === "row" ? "flex flex-wrap gap-2" : "flex min-w-[160px] flex-col gap-2"}
    >
      <Button type="button" size="sm" variant="outline" asChild>
        <Link href={`/admin/users/${user.id}/edit`}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Bearbeiten
        </Link>
      </Button>
      <Button
        type="button"
        size="sm"
        variant={user.isActive ? "outline" : "secondary"}
        disabled={pending || (isSelf && user.isActive)}
        onClick={() => onToggleActive(user, !user.isActive)}
      >
        {user.isActive ? "Deaktivieren" : "Aktivieren"}
      </Button>
    </div>
  )
}
