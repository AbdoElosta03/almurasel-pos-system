import { useState } from 'react'
import { Shield, Trash2, ToggleLeft, ToggleRight, User as UserIcon, Users } from 'lucide-react'

import type { User } from '../../../../types'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Card } from '../../../../components/ui/card'
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog'
import { tableHeadCellStickyClass, tableHeaderRowClass, tableScrollContainerClass } from '../../../../shared/lib/tableScroll'

export function UserList({
  users,
  currentUserId,
  onToggleActive,
  onDelete,
}: {
  users: User[]
  currentUserId?: number
  onToggleActive: (user: User) => Promise<void>
  onDelete: (user: User) => Promise<void>
}) {
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (users.length === 0) {
    return (
      <Card className="rounded-[2rem] border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
        <div className="flex flex-col items-center justify-center space-y-4">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Users className="size-8" />
          </span>
          <div>
            <p className="text-xl font-extrabold text-foreground">لا يوجد مستخدمون مسجلون</p>
            <p className="mt-1 text-sm">اضغط على زر إضافة مستخدم جديد بالأعلى لإنشاء حساب.</p>
          </div>
        </div>
      </Card>
    )
  }

  const handleToggle = async (user: User) => {
    setTogglingId(user.id)
    try {
      await onToggleActive(user)
    } finally {
      setTogglingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await onDelete(pendingDelete)
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const isActionBusy = togglingId !== null || deleting
  const itemCount = users.length

  return (
    <Card className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_12px_40px_-24px_rgba(18,83,78,0.12)]">
      <div className={tableScrollContainerClass(itemCount)}>
        <table className="w-full border-collapse text-right select-none">
          <thead>
            <tr className={`h-14 border-b border-border text-base font-bold text-muted-foreground ${tableHeaderRowClass(itemCount)}`}>
              {['#', 'المستخدم', 'الصلاحية (الدور)', 'الحالة', 'الإجراءات'].map((label) => (
                <th
                  key={label}
                  className={`px-6 py-3 font-extrabold text-foreground ${label === 'الإجراءات' ? 'text-center' : ''} ${tableHeadCellStickyClass(itemCount)}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-lg">
            {users.map((user, index) => {
              const isAdmin = user.role === 'admin'
              const isToggling = togglingId === user.id
              const isSelf = user.id === currentUserId

              return (
                <tr key={user.id} className="h-20 transition-colors hover:bg-secondary/10">
                  <td className="w-12 px-6 py-4 text-sm font-semibold text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="min-w-56 px-6 py-4 font-extrabold text-foreground">
                    <div className="flex items-center gap-3">
                      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${isAdmin ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {isAdmin ? <Shield className="size-5" /> : <UserIcon className="size-5" />}
                      </span>
                      <span className="line-clamp-1">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-muted-foreground">
                    <span>{isAdmin ? 'مدير النظام' : 'مستخدم كاشير'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.is_active ? 'default' : 'destructive'} className="gap-1.5 px-3 py-1 text-sm">
                      <span className={`size-2 rounded-full ${user.is_active ? 'bg-emerald-300' : 'bg-red-300'}`} />
                      {user.is_active ? 'نشط' : 'معطّل'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        variant={user.is_active ? 'outline' : 'secondary'}
                        size="sm"
                        onClick={() => void handleToggle(user)}
                        disabled={isActionBusy}
                        loading={isToggling}
                        className="h-11 min-h-11 w-28 rounded-xl border-border/80 px-4 text-base font-bold text-foreground"
                      >
                        {!isToggling && (
                          user.is_active ? (
                            <>
                              <ToggleRight className="size-5 shrink-0 text-emerald-600" />
                              <span>تعطيل</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="size-5 shrink-0 text-muted-foreground" />
                              <span>تفعيل</span>
                            </>
                          )
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setPendingDelete(user)}
                        disabled={isActionBusy || isSelf}
                        className="size-11 min-h-11 shrink-0 rounded-xl border border-red-100 bg-red-50 p-0 text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-40"
                        title={isSelf ? 'لا يمكن حذف حسابك الحالي' : 'حذف المستخدم'}
                        aria-label={`حذف المستخدم ${user.username}`}
                      >
                        <Trash2 className="size-5 shrink-0" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="حذف المستخدم"
        description={pendingDelete ? `هل تريد حذف المستخدم «${pendingDelete.username}»؟ لا يمكن التراجع عن هذا الإجراء.` : ''}
        confirmLabel="تأكيد الحذف"
        confirmVariant="destructive"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setPendingDelete(null)}
      />
    </Card>
  )
}
