import { useState } from 'react'
import type { FormEvent } from 'react'

import { recoverAdmin } from '../../../api/auth'
import { ApiError } from '../../../api/errors'
import { Alert } from '../../../shared/ui/Alert'
import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { isValidPin } from '../../../shared/lib/pinPolicy'
import { NumericPinInput } from '../../../shared/ui/NumericPinInput'

export function AdminRecoveryDialog({
  open,
  onClose,
  onRecovered,
}: {
  open: boolean
  onClose: () => void
  onRecovered: () => void
}) {
  const [username, setUsername] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const close = () => {
    setRecoveryKey('')
    setNewPassword('')
    setConfirmation('')
    setError(null)
    onClose()
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (newPassword !== confirmation) {
      setError('كلمتا المرور الجديدتان غير متطابقتين')
      return
    }
    if (!isValidPin(newPassword)) {
      setError('الرمز الجديد يجب أن يكون أرقامًا فقط (من 4 إلى 32 رقمًا)')
      return
    }
    setBusy(true)
    try {
      await recoverAdmin({ username, recovery_key: recoveryKey, new_password: newPassword, confirm_new_password: confirmation })
      setUsername('')
      setRecoveryKey('')
      setNewPassword('')
      setConfirmation('')
      onRecovered()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر استعادة حساب المدير')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) close() }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>استعادة حساب المدير</DialogTitle>
          <DialogDescription>أدخل اسم المدير ومفتاح الاستعادة الذي يقدّمه مسؤول النظام، ثم اختر كلمة مرور جديدة.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="recovery-username">اسم المدير</Label>
            <Input id="recovery-username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required maxLength={64} disabled={busy} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recovery-key">مفتاح الاستعادة</Label>
            <Input id="recovery-key" type="password" value={recoveryKey} onChange={(event) => setRecoveryKey(event.target.value)} autoComplete="off" required disabled={busy} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recovery-password">الرمز الجديد (أرقام)</Label>
            <NumericPinInput id="recovery-password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" disabled={busy} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recovery-confirmation">تأكيد الرمز الجديد</Label>
            <NumericPinInput id="recovery-confirmation" value={confirmation} onChange={setConfirmation} autoComplete="new-password" disabled={busy} />
          </div>
          {error ? <Alert>{error}</Alert> : null}
          <Button type="submit" size="lg" loading={busy} className="w-full">تغيير كلمة مرور المدير</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
