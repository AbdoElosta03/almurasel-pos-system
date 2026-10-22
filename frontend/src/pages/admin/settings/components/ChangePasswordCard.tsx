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
import { isValidPin } from '../../../../shared/lib/pinPolicy'
import { NumericPinInput } from '../../../../shared/ui/NumericPinInput'

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
    if (!isValidPin(newPassword)) {
      setError('الرمز الجديد يجب أن يكون أرقامًا فقط (من 4 إلى 32 رقمًا)')
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

  const isFormValid = currentPassword && isValidPin(newPassword) && newPassword === confirmNewPassword

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <KeyRound className="size-6 text-primary" aria-hidden="true" />
            تغيير كلمة المرور
          </DialogTitle>
          <DialogDescription>الرمز الجديد أرقام فقط (من 4 إلى 32 رقمًا).</DialogDescription>
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
            <Label htmlFor="new-password" className="text-base font-bold">الرمز الجديد (أرقام)</Label>
            <NumericPinInput
              id="new-password"
              autoComplete="new-password"
              value={newPassword}
              onChange={setNewPassword}
              disabled={busy}
              className="h-14 rounded-2xl text-lg"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-new-password" className="text-base font-bold">تأكيد الرمز الجديد</Label>
            <NumericPinInput
              id="confirm-new-password"
              autoComplete="new-password"
              value={confirmNewPassword}
              onChange={setConfirmNewPassword}
              disabled={busy}
              className="h-14 rounded-2xl text-lg"
            />
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
