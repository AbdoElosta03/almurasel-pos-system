import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, LogIn } from 'lucide-react'

import { ApiError } from '../../../api/errors'
import { useAuth } from '../../../context/AuthContext'
import { Alert } from '../../../shared/ui/Alert'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'

export function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!username.trim() || !password.trim()) return
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

  const isFormValid = username.trim() && password.trim()

  return (
    <form className="flex w-full flex-col gap-5" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="username" className="text-base font-bold text-foreground">اسم المستخدم</Label>
        <div className="relative">
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="أدخل اسم المستخدم"
            className="h-14 min-h-14 pr-11 pl-4 text-lg rounded-2xl"
          />
          <User className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-base font-bold text-foreground">كلمة المرور</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="أدخل كلمة المرور"
            className="h-14 min-h-14 pr-11 pl-12 text-lg rounded-2xl"
          />
          <Lock className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-1/2 left-2 flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all -translate-y-1/2"
            tabIndex={-1}
            aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>

      {error ? <Alert className="mt-2">{error}</Alert> : null}

      <Button
        type="submit"
        size="lg"
        loading={submitting}
        disabled={!isFormValid}
        className="w-full mt-2 h-14 rounded-2xl gap-2 font-bold text-lg shadow-lg shadow-primary/20"
      >
        <LogIn className="size-5 shrink-0" />
        <span>دخول إلى النظام</span>
      </Button>
    </form>
  )
}
