import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Shield, User, Key } from 'lucide-react'

import type { Role } from '../../../../types'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { NativeSelect } from '../../../../components/ui/native-select'
import { Label } from '../../../../components/ui/label'

export function UserCreateForm({
  onCreate,
  onClose,
}: {
  onCreate: (body: { username: string; password: string; role: Role }) => Promise<void>
  onClose: () => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('cashier')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!username.trim() || !password.trim()) return
    setBusy(true)
    try {
      await onCreate({ username, password, role })
      setUsername('')
      setPassword('')
      setRole('cashier')
      onClose()
    } catch (err) {
      // Handled by parent or toast
    } finally {
      setBusy(false)
    }
  }

  const isFormValid = username.trim() && password.trim()

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="create-username" className="text-base font-bold text-foreground">اسم المستخدم</Label>
        <div className="relative">
          <Input
            id="create-username"
            placeholder="مثال: mohammed"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="pr-10 h-14 rounded-2xl text-lg"
            disabled={busy}
          />
          <User className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="create-password" className="text-base font-bold text-foreground">كلمة المرور</Label>
        <div className="relative">
          <Input
            id="create-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10 h-14 rounded-2xl text-lg"
            disabled={busy}
          />
          <Key className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="create-role" className="text-base font-bold text-foreground">الصلاحية (الدور)</Label>
        <div className="relative">
          <NativeSelect
            id="create-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="pr-10 h-14 rounded-2xl text-lg"
            disabled={busy}
          >
            <option value="cashier">كاشير (صلاحيات بيع فقط)</option>
            <option value="admin">مدير (كافة الصلاحيات والتقارير)</option>
          </NativeSelect>
          <Shield className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground z-10" />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-border/60">
        <Button
          type="submit"
          size="lg"
          loading={busy}
          disabled={!isFormValid}
          className="flex-1 h-14 rounded-2xl gap-2 font-bold text-lg"
        >
          <Plus className="size-5 shrink-0" />
          <span>حفظ المستخدم</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onClose}
          disabled={busy}
          className="flex-1 h-14 rounded-2xl font-bold text-lg"
        >
          إلغاء
        </Button>
      </div>
    </form>
  )
}
