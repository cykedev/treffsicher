import type { AdminUserListItem } from "@/lib/admin/actions"
import { Badge } from "@/components/ui/badge"
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

// Desktop-Tabelle zeigt volle Nutzermetrik; Mobile bekommt eine separate, kompaktere Variante.
export function AdminUsersTableDesktop({
  users,
  currentAdminId,
  displayTimeZone,
  pending,
  onToggleActive,
}: Props) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="min-w-[920px] w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Nutzer</th>
            <th className="pb-2 pr-4 font-medium">Rolle</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 pr-4 font-medium">Aktivität</th>
            <th className="pb-2 pr-4 font-medium">Letzte Session-Änderung</th>
            <th className="pb-2 font-medium">Aktion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {users.map((user) => {
            const isSelf = user.id === currentAdminId

            return (
              <tr key={user.id}>
                <td className="py-3 pr-4">
                  <div className="max-w-[280px] space-y-1">
                    {/* Name/Email/Created gruppieren, damit Aktionsspalte visuell ruhig bleibt. */}
                    <p className="break-words font-medium leading-tight">{user.name ?? "—"}</p>
                    <p className="break-all text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Angelegt: {formatDate(user.createdAt, displayTimeZone)}
                    </p>
                  </div>
                </td>
                <td className="py-2 pr-4">
                  <Badge variant="outline" className={getRoleBadgeClass(user.role)}>
                    {user.role}
                  </Badge>
                </td>
                <td className="py-2 pr-4">
                  <Badge variant="outline" className={getStatusBadgeClass(user.isActive)}>
                    {user.isActive ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </td>
                <td className="py-3 pr-4">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      <span className="tabular-nums text-foreground">
                        {formatCount(user.sessionsCount)}
                      </span>{" "}
                      Einheiten
                    </p>
                    <p>
                      <span className="tabular-nums text-foreground">
                        {formatCount(user.goalsCount)}
                      </span>{" "}
                      Ziele
                    </p>
                    <p>
                      <span className="tabular-nums text-foreground">
                        {formatCount(user.shotRoutinesCount)}
                      </span>{" "}
                      Abläufe
                    </p>
                  </div>
                </td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {formatOptionalDate(user.lastSessionEditAt, displayTimeZone)}
                </td>
                <td className="py-2">
                  <AdminUserActionButtons
                    user={user}
                    isSelf={isSelf}
                    pending={pending}
                    onToggleActive={onToggleActive}
                    layout="column"
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
