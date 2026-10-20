import { useEffect, useState } from 'react'
import { ArrowRight, Database, Download, RotateCcw, Upload } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { createBackup, downloadBackup, listBackups, restoreSavedBackup, restoreUploadedBackup, type Backup } from '../../../../api/backups'
import { ApiError } from '../../../../api/errors'
import { Button } from '../../../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../../components/ui/dialog'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { useAuth } from '../../../../context/AuthContext'
import { Alert } from '../../../../shared/ui/Alert'
import { Card } from '../../../../shared/ui/Card'
import { PageHeader } from '../../../../shared/ui/PageHeader'

export function DatabasePage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [restoreSource, setRestoreSource] = useState<{ filename: string } | { file: File } | null>(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  useEffect(() => {
    listBackups()
      .then(setBackups)
      .catch(() => setError('تعذر تحميل النسخ الاحتياطية'))
      .finally(() => setLoading(false))
  }, [])

  const onCreate = async () => {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const backup = await createBackup()
      setBackups((current) => [backup, ...current])
      setSuccess('تم إنشاء النسخة الاحتياطية. يمكنك تنزيلها الآن.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر إنشاء النسخة الاحتياطية')
    } finally {
      setBusy(false)
    }
  }

  const onDownload = async (filename: string) => {
    setError(null)
    try {
      await downloadBackup(filename)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر تنزيل النسخة الاحتياطية')
    }
  }

  const onRestore = async () => {
    if (!restoreSource || !password || confirmation !== 'استعادة') return
    setRestoring(true)
    setRestoreError(null)
    try {
      if ('file' in restoreSource) {
        await restoreUploadedBackup(restoreSource.file, password)
      } else {
        await restoreSavedBackup(restoreSource.filename, password)
      }
      logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setRestoreError(err instanceof ApiError ? err.message : 'تعذرت الاستعادة؛ لم تكتمل العملية')
    } finally {
      setRestoring(false)
    }
  }

  const closeRestore = () => {
    setRestoreSource(null)
    setPassword('')
    setConfirmation('')
    setRestoreError(null)
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Link to="/admin/settings" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
        <ArrowRight className="size-4" aria-hidden="true" /> العودة إلى الإعدادات
      </Link>
      <div className="border-b border-border/40 pb-4">
        <PageHeader title="قاعدة البيانات" description="إنشاء النسخ الاحتياطية ومراجعتها واستعادة نسخة سابقة." />
      </div>

      <Card className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Database className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold">النسخ الاحتياطي</h3>
            <p className="mt-1 text-sm text-muted-foreground">نسخة تلقائية كل 20 يومًا أثناء تشغيل الخادم، ويمكنك إنشاء نسخة يدويًا في أي وقت.</p>
          </div>
          <Button onClick={onCreate} loading={busy} disabled={busy}>إنشاء نسخة</Button>
        </div>
        {error ? <Alert>{error}</Alert> : null}
        {success ? <Alert tone="success">{success}</Alert> : null}
        <div className="space-y-2">
          {loading ? <p className="text-sm text-muted-foreground">جاري تحميل النسخ الاحتياطية...</p> : null}
          {!loading && !error && backups.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد نسخ احتياطية محفوظة بعد.</p> : null}
          {backups.map((backup) => (
            <div key={backup.filename} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{backup.kind === 'auto' ? 'تلقائية' : backup.kind === 'safety' ? 'نسخة أمان قبل الاستعادة' : 'يدوية'} — {new Date(backup.created_at).toLocaleString('ar-LY')}</p>
                <p className="text-xs text-muted-foreground">{(backup.size_bytes / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => void onDownload(backup.filename)}>
                  <Download className="size-4" aria-hidden="true" /> تنزيل
                </Button>
                <Button variant="outline" size="sm" onClick={() => setRestoreSource({ filename: backup.filename })}>
                  <RotateCcw className="size-4" aria-hidden="true" /> استعادة
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-lg font-bold">استعادة نسخة من جهازك</h3>
        <p className="text-sm text-muted-foreground">ارفع ملف قاعدة بيانات SQLite بامتداد .db. ستُستبدل جميع البيانات الحالية ببيانات الملف.</p>
        <Input type="file" accept=".db,application/vnd.sqlite3" aria-label="اختر ملف نسخة احتياطية" onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) setRestoreSource({ file })
          event.target.value = ''
        }} />
      </Card>

      <Dialog open={restoreSource !== null} onOpenChange={(open) => { if (!open && !restoring) closeRestore() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد استعادة قاعدة البيانات</DialogTitle>
            <DialogDescription>سيتم استبدال كل الفواتير والمنتجات والحسابات والورديات الحالية ببيانات النسخة المختارة. ستُنشأ نسخة أمان أولاً، وستحتاج إلى تسجيل الدخول مجددًا بعد النجاح.</DialogDescription>
          </DialogHeader>
          <p className="break-all text-sm font-medium">{restoreSource && ('file' in restoreSource ? restoreSource.file.name : restoreSource.filename)}</p>
          <div className="space-y-2">
            <Label htmlFor="restore-password">كلمة مرور المدير الحالية</Label>
            <Input id="restore-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={restoring} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="restore-confirmation">اكتب «استعادة» للتأكيد</Label>
            <Input id="restore-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={restoring} />
          </div>
          {restoreError ? <Alert>{restoreError}</Alert> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={closeRestore} disabled={restoring}>إلغاء</Button>
            <Button onClick={() => void onRestore()} disabled={!password || confirmation !== 'استعادة' || restoring} loading={restoring}>
              <Upload className="size-4" aria-hidden="true" /> استبدال البيانات
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
