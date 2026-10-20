import { useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react'

import { changePassword } from '../../../../api/auth'
import { ApiError } from '../../../../api/errors'
import { Alert } from '../../../../shared/ui/Alert'
import { Button } from '../../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!currentPassword || !newPassword || !confirmNewPassword) return

    setError(null)
    setSuccess(false)
    if (newPassword !== confirmNewPassword) {
      setError('كلمتا المرور الجديدتان غير متطابقتين')
      return
    }

    setBusy(true)
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر تغيير كلمة المرور')
    } finally {
      setBusy(false)
    }
  }

  const isFormValid = currentPassword && newPassword.length >= 4 && confirmNewPassword.length >= 4

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <KeyRound className="size-6 text-primary" aria-hidden="true" />
            تغيير كلمة المرور
          </DialogTitle>
          <DialogDescription>استخدم كلمة مرور جديدة لا تقل عن 4 أحرف.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="current-password" className="text-base font-bold">كلمة المرور الحالية</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={busy}
                className="h-14 rounded-2xl pr-10 pl-12 text-lg"
              />
              <LockKeyhole className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute top-1/2 left-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label={showCurrentPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showCurrentPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password" className="text-base font-bold">كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={4}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={busy}
                className="h-14 rounded-2xl pl-12 text-lg"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute top-1/2 left-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label={showNewPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showNewPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-new-password" className="text-base font-bold">تأكيد كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input
                id="confirm-new-password"
                type={showConfirmNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={4}
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                disabled={busy}
                className="h-14 rounded-2xl pl-12 text-lg"
              />
              <button
                type="button"
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                className="absolute top-1/2 left-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label={showConfirmNewPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showConfirmNewPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>

          {error ? <Alert>{error}</Alert> : null}
          {success ? <Alert tone="success">تم تغيير كلمة المرور بنجاح.</Alert> : null}

          <Button type="submit" size="lg" loading={busy} disabled={!isFormValid} className="w-full">
            تغيير كلمة المرور
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
