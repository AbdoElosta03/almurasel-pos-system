import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import { ApiError } from '../../../api/errors'
import * as usersApi from '../../../api/users'
import { useAuth } from '../../../context/AuthContext'
import type { User } from '../../../types'
import { Alert } from '../../../shared/ui/Alert'
import { LoadingBlock } from '../../../shared/ui/LoadingBlock'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { Toast, type ToastMessage } from '../../../shared/ui/Toast'
import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { UserCreateForm } from './components/UserCreateForm'
import { UserList } from './components/UserList'

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const data = await usersApi.listUsers()
    setUsers(data)
  }, [])

  useEffect(() => {
    void load()
      .catch((err) => setError(err instanceof ApiError ? err.message : 'تعذر تحميل المستخدمين'))
      .finally(() => setLoading(false))
  }, [load])

  if (loading) {
    return <LoadingBlock />
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="المستخدمون" description="إدارة حسابات النظام وتعديل صلاحيات المدير والكاشير." />
        <Button
          onClick={() => setIsCreateOpen(true)}
          size="lg"
          className="h-14 min-h-14 shrink-0 rounded-2xl px-6 text-lg font-bold shadow-lg shadow-primary/15"
        >
          <Plus className="size-5 shrink-0" />
          <span>إضافة مستخدم جديد</span>
        </Button>
      </div>

      {error ? <Alert className="mb-4">{error}</Alert> : null}

      <UserList
        users={users}
        currentUserId={currentUser?.id}
        onToggleActive={async (user) => {
          await usersApi.updateUser(user.id, { is_active: !user.is_active })
          await load()
        }}
        onDelete={async (user) => {
          try {
            await usersApi.deleteUser(user.id)
            await load()
            setToast({ tone: 'success', text: `تم حذف المستخدم «${user.username}»` })
          } catch (err) {
            const text = err instanceof ApiError ? err.message : 'تعذر حذف المستخدم'
            setToast({ tone: 'error', text })
          }
        }}
      />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مستخدم جديد</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <UserCreateForm
              onCreate={async (body) => {
                await usersApi.createUser(body)
                await load()
              }}
              onClose={() => setIsCreateOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
