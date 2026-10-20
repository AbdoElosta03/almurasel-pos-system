import { useState } from 'react'
import { ChevronLeft, Database, KeyRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../shared/ui/Card'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { ChangePasswordDialog } from './components/ChangePasswordCard'

export function SettingsPage() {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="border-b border-border/40 pb-4">
        <PageHeader title="الإعدادات" description="مساحة لتخصيص بيانات المحل وتفضيلات النظام." />
      </div>

      <div className="space-y-4">
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

        <Link to="/admin/settings/database" className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <Card className="flex items-center gap-4 transition-colors hover:bg-secondary/40">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
              <Database className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold">قاعدة البيانات</h3>
              <p className="mt-1 text-sm text-muted-foreground">إدارة النسخ الاحتياطية اليدوية والتلقائية وتنزيلها.</p>
            </div>
            <ChevronLeft className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Card>
        </Link>
      </div>

      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </div>
  )
}
