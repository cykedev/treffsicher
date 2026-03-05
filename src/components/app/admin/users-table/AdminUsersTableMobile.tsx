import type { AdminUserListItem } from "@/lib/admin/actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { AdminUserActionButtons } from "@/components/app/admin/users-table/AdminUserActionButtons"
import {
  formatCount,
  formatDate,
  formatOptionalDate,
  getRoleBadgeClass,
  getStatusBadgeClass,
} from "@/components/app/admin/users-table/formatting"

interface Props {
  users: AdminUserListItem[]
  currentAdminId: string
  displayTimeZone: string
  pending: boolean
  onToggleActive: (user: AdminUserListItem, nextIsActive: boolean) => void
}

export function AdminUsersTableMobile({
  users,
  currentAdminId,
  displayTimeZone,
  pending,
  onToggleActive,
}: Props) {
  return (
    <div className="space-y-2 md:hidden">
      {users.map((user) => {
        const isSelf = user.id === currentAdminId

        return (
          <Card key={user.id}>
            <CardContent className="space-y-3 py-4">
              <div className="space-y-1">
                <p className="break-words font-medium">{user.name ?? "—"}</p>
                <p className="break-all text-sm text-muted-foreground">{user.email}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={getRoleBadgeClass(user.role)}>
                  {user.role}
                </Badge>
                <Badge variant="outline" className={getStatusBadgeClass(user.isActive)}>
                  {user.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                Angelegt: {formatDate(user.createdAt, displayTimeZone)}
              </p>
              <p className="text-xs text-muted-foreground">
                Aktivität: {formatCount(user.sessionsCount)} Einheiten,{" "}
                {formatCount(user.goalsCount)} Ziele, {formatCount(user.shotRoutinesCount)} Abläufe
              </p>
              <p className="text-xs text-muted-foreground">
                Letzte Session-Änderung:{" "}
                {formatOptionalDate(user.lastSessionEditAt, displayTimeZone)}
              </p>

              <AdminUserActionButtons
                user={user}
                isSelf={isSelf}
                pending={pending}
                onToggleActive={onToggleActive}
                layout="row"
              />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
