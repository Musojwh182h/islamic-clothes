import { ArrowLeft, Check, LogOut, PackageSearch, ShieldCheck, Smartphone, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
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
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
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

  if (!isOpen) return null

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const result = await requestLoginCode(phone)
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
      const result = await verifyLoginCode(phone, code)
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
    setStep('phone')
    setPhone('')
    setCode('')
    setSubmitting(false)
  }

  return (
    <div className="auth-layer">
      <button className="auth-backdrop" onClick={onClose} aria-label="Закрыть окно авторизации" />
      <section className={`auth-dialog ${user && accountView === 'orders' ? 'orders-history-dialog' : ''}`} role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="auth-close icon-button" onClick={onClose} aria-label="Закрыть"><X size={21} /></button>

        {user && accountView === 'orders' ? (
          <CustomerOrders onBack={() => setAccountView('profile')} onSessionExpired={onLoggedOut} />
        ) : user ? (
          <div className="account-view">
            <span className="auth-symbol"><Check size={27} /></span>
            <p className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</p>
            <h2 id="auth-title">Вы вошли.</h2>
            <p className="account-phone">{user.phone}</p>
            <span className="account-role">Роль: {user.role === 'admin' ? 'администратор' : 'покупатель'}</span>
            <button className="primary-button account-orders-button" type="button" onClick={() => setAccountView('orders')}><PackageSearch size={17} /> Мои заказы</button>
            <button className="secondary-button" onClick={logout} disabled={isSubmitting}><LogOut size={16} /> Выйти</button>
          </div>
        ) : (
          <div className="auth-content">
            <span className="auth-symbol">{step === 'phone' ? <Smartphone size={27} /> : <ShieldCheck size={27} />}</span>
            <p className="eyebrow">ВХОД И РЕГИСТРАЦИЯ</p>
            <h2 id="auth-title">{step === 'phone' ? 'Ваш номер телефона.' : 'Введите код.'}</h2>
            <p className="auth-description">{step === 'phone' ? 'Отправим одноразовый код. Если аккаунта ещё нет — создадим его автоматически.' : `Код отправлен на ${phone}`}</p>

            {step === 'phone' ? (
              <form className="auth-form" onSubmit={requestCode}>
                <label><span>Номер телефона</span><input type="tel" value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" required minLength={10} placeholder="+7 999 123-45-67" autoFocus /></label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Отправляем…' : 'Получить код'}</button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={verifyCode}>
                <label><span>Код из SMS</span><input className="code-input" inputMode="numeric" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" required pattern="\d{6}" placeholder="000000" autoFocus /></label>
                {debugCode && <div className="debug-code"><span>Тестовый код</span><strong>{debugCode}</strong></div>}
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="primary-button" type="submit" disabled={isSubmitting || code.length !== 6}>{isSubmitting ? 'Проверяем…' : 'Войти'}</button>
                <button className="auth-back" type="button" onClick={() => { setStep('phone'); setCode(''); setError('') }}><ArrowLeft size={15} /> Изменить номер</button>
              </form>
            )}
            <p className="auth-legal">Продолжая, вы соглашаетесь с обработкой номера телефона для входа в магазин.</p>
          </div>
        )}
      </section>
    </div>
  )
}
