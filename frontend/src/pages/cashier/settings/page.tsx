import { useState } from 'react'
import { KeyRound } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../shared/ui/Card'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { ChangePasswordDialog } from '../../admin/settings/components/ChangePasswordCard'

export function CashierSettingsPage() {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="border-b border-border/40 pb-4">
        <PageHeader title="الإعدادات" description="إدارة إعدادات حسابك." />
      </div>
      <Card className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <KeyRound className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold">كلمة المرور</h3>
          <p className="mt-1 text-sm text-muted-foreground">تغيير كلمة مرور حسابك الحالي.</p>
        </div>
        <Button onClick={() => setPasswordDialogOpen(true)} className="shrink-0">تغيير كلمة المرور</Button>
      </Card>
      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </div>
  )
}
