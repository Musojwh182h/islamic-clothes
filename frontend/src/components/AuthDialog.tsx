import { ArrowLeft, Check, LogOut, Mail, PackageSearch, ShieldCheck, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { logoutAuthSession, requestLoginCode, verifyLoginCode, type AuthUser } from '../services/auth'
import { CustomerOrders } from './CustomerOrders'

type Props = {
  isOpen: boolean
  user: AuthUser | null
  onClose: () => void
  onAuthenticated: (user: AuthUser) => void
  onLoggedOut: () => void
}

export function AuthDialog({ isOpen, user, onClose, onAuthenticated, onLoggedOut }: Props) {
  const dialogRef = useRef<HTMLElement>(null)
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [debugCode, setDebugCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setSubmitting] = useState(false)
  const [accountView, setAccountView] = useState<'profile' | 'orders'>('profile')

  useEffect(() => {
    if (!isOpen || user) return
    setError('')
  }, [isOpen, user])

  useEffect(() => {
    if (!isOpen || !user) setAccountView('profile')
  }, [isOpen, user])

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose()
      if (event.key !== 'Tab') return
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      ) ?? [])
      if (controls.length === 0) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (!controls.includes(document.activeElement as HTMLElement)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    const focusFrame = window.requestAnimationFrame(() => dialogRef.current?.focus())
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [accountView, isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const result = await requestLoginCode(email)
      setDebugCode(result.debug_code)
      setStep('code')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось отправить код')
    } finally {
      setSubmitting(false)
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const result = await verifyLoginCode(email, code)
      onAuthenticated(result.user)
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Не удалось проверить код')
    } finally {
      setSubmitting(false)
    }
  }

  async function logout() {
    setSubmitting(true)
    await logoutAuthSession()
    onLoggedOut()
    setAccountView('profile')
    setStep('email')
    setEmail('')
    setCode('')
    setSubmitting(false)
  }

  return (
    <div className="auth-layer">
      <button className="auth-backdrop" type="button" onClick={onClose} aria-label="Закрыть окно авторизации" />
      <section ref={dialogRef} tabIndex={-1} className={`auth-dialog ${user && accountView === 'orders' ? 'orders-history-dialog' : ''}`} role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="auth-close icon-button" type="button" onClick={onClose} aria-label="Закрыть"><X size={21} /></button>

        {user && accountView === 'orders' ? (
          <CustomerOrders onBack={() => setAccountView('profile')} onSessionExpired={onLoggedOut} />
        ) : user ? (
          <div className="account-view">
            <span className="auth-symbol"><Check size={27} /></span>
            <p className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</p>
            <h2 id="auth-title">Вы вошли.</h2>
            <p className="account-email">{user.email}</p>
            <button className="primary-button account-orders-button" type="button" onClick={() => setAccountView('orders')}><PackageSearch size={17} /> Мои заказы</button>
            <button className="secondary-button" type="button" onClick={() => void logout()} disabled={isSubmitting}><LogOut size={16} /> Выйти</button>
          </div>
        ) : (
          <div className="auth-content">
            <span className="auth-symbol">{step === 'email' ? <Mail size={27} /> : <ShieldCheck size={27} />}</span>
            <p className="eyebrow">ВХОД И РЕГИСТРАЦИЯ</p>
            <h2 id="auth-title">{step === 'email' ? 'Ваша почта.' : 'Введите код.'}</h2>
            <p className="auth-description">{step === 'email' ? 'Отправим одноразовый код. Если аккаунта ещё нет — создадим его автоматически.' : `Код отправлен на ${email}`}</p>

            {step === 'email' ? (
              <form className="auth-form" onSubmit={requestCode}>
                <label><span>Электронная почта</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required maxLength={320} placeholder="you@example.com" autoFocus /></label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Отправляем…' : 'Получить код'}</button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={verifyCode}>
                <label><span>Код из письма</span><input className="code-input" inputMode="numeric" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" required pattern="\d{6}" placeholder="000000" autoFocus /></label>
                {debugCode && <div className="debug-code"><span>Тестовый код</span><strong>{debugCode}</strong></div>}
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="primary-button" type="submit" disabled={isSubmitting || code.length !== 6}>{isSubmitting ? 'Проверяем…' : 'Войти'}</button>
                <button className="auth-back" type="button" onClick={() => { setStep('email'); setCode(''); setError('') }}><ArrowLeft size={15} /> Изменить почту</button>
              </form>
            )}
            <p className="auth-legal">Продолжая, вы соглашаетесь с обработкой электронной почты для входа в магазин.</p>
          </div>
        )}
      </section>
    </div>
  )
}
