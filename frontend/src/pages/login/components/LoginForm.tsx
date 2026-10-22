import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, LockKeyhole } from 'lucide-react'

import * as authApi from '../../../api/auth'
import { ApiError } from '../../../api/errors'
import { useAuth } from '../../../context/AuthContext'
import type { LoginAccount } from '../../../types'
import { PIN_MIN_LENGTH } from '../../../shared/lib/pinPolicy'
import { Alert } from '../../../shared/ui/Alert'
import { LoadingBlock } from '../../../shared/ui/LoadingBlock'
import { Button } from '../../../components/ui/button'
import { Label } from '../../../components/ui/label'
import logoLight from '../../../assets/logo-light.png'
import { AccountSelect } from './AccountSelect'
import { NumericKeypad } from './NumericKeypad'

export function LoginForm({ onLogoClick }: { onLogoClick?: () => void }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<LoginAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void authApi.listLoginAccounts()
      .then((items) => {
        setAccounts(items)
        if (items.length > 0) setUsername(items[0].username)
      })
      .catch(() => setAccounts([]))
      .finally(() => setAccountsLoading(false))
  }, [])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!username || password.length < PIN_MIN_LENGTH) return
    setSubmitting(true)
    setError(null)
    try {
      const role = await login(username, password)
      navigate(role === 'admin' ? '/admin/reports' : '/cashier/pos')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر تسجيل الدخول')
    } finally {
      setSubmitting(false)
    }
  }

  const isFormValid = Boolean(username) && password.length >= PIN_MIN_LENGTH

  if (accountsLoading) {
    return <LoadingBlock />
  }

  return (
    <form className="grid w-full gap-7 md:grid-cols-2 md:items-start md:gap-8 lg:gap-12" onSubmit={onSubmit}>
      <section className="order-2 flex flex-col justify-center rounded-[2rem] bg-secondary/25 p-4 sm:p-6 md:order-1 lg:p-7">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LockKeyhole className="size-5" />
          </span>
          <div>
            <Label className="text-lg font-extrabold text-foreground">رمز الدخول</Label>
            <p className="text-sm font-medium text-muted-foreground">أدخل رمزك الرقمي للمتابعة</p>
          </div>
        </div>
        <NumericKeypad value={password} onChange={setPassword} disabled={submitting} />
        {error ? <Alert className="mt-4">{error}</Alert> : null}
        <Button
          type="submit"
          size="lg"
          loading={submitting}
          disabled={!isFormValid}
          className="mt-4 h-14 w-full gap-2 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20"
        >
          <LogIn className="size-5 shrink-0" />
          <span>دخول إلى النظام</span>
        </Button>
      </section>

      <section className="order-1 flex flex-col items-center justify-start px-2 pt-0 pb-2 md:order-2 md:px-4 md:pt-1">
        <button
          type="button"
          onClick={onLogoClick}
          aria-label="شعار المراسل"
          className="flex h-[4.5rem] w-[7.25rem] items-center justify-center rounded-2xl bg-primary p-2 shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <img src={logoLight} alt="" className="max-h-full max-w-full object-contain" />
        </button>
        <div className="mt-3 w-full text-center">
          <h1 className="text-2xl font-black tracking-tight text-foreground lg:text-3xl">
            المراسل <span className="font-black text-primary">POS</span>
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground lg:text-base">مرحبًا بك، اختر حسابك للبدء</p>
        </div>
        <div className="mt-3.5 flex w-full max-w-sm flex-col gap-2">
          <Label htmlFor="username" className="text-base font-extrabold text-foreground">اختر الحساب</Label>
          <AccountSelect
            accounts={accounts}
            value={username}
            onChange={(nextUsername) => {
              setUsername(nextUsername)
              setPassword('')
              setError(null)
            }}
            disabled={submitting || accounts.length === 0}
          />
        </div>
      </section>
    </form>
  )
}
