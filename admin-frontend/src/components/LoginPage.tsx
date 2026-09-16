import { useState, type FormEvent } from 'react'
import {
  Button,
  Card,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Text,
  Title1,
} from '@fluentui/react-components'
import { ArrowRightRegular, LockClosedRegular } from '@fluentui/react-icons'

import { AdminApi, ApiError } from '../services/api'
import type { AuthSession } from '../types'

type LoginPageProps = {
  api: AdminApi
  onAuthenticated: (session: AuthSession) => void
}

export function LoginPage({ api, onAuthenticated }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [debugCode, setDebugCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submitEmail(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const response = await api.requestCode(email)
      setDebugCode(response.debug_code ?? null)
      setStep('code')
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось отправить код')
    } finally {
      setBusy(false)
    }
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      onAuthenticated(await api.verifyCode(email, code))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось выполнить вход')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-layout">
      <section className="login-brand" aria-label="SABR">
        <div className="brand-mark" aria-hidden="true">S</div>
        <Text className="brand-name">SABR</Text>
        <Title1>Управление магазином</Title1>
        <Text size={400}>Товары, остатки и заказы в одном защищённом рабочем пространстве.</Text>
      </section>

      <Card className="login-card">
        <div className="login-lock" aria-hidden="true"><LockClosedRegular /></div>
        <div>
          <Text weight="semibold" size={500}>Вход администратора</Text>
          <Text block className="muted-copy">Доступ подтверждается одноразовым кодом из письма.</Text>
        </div>

        {error && (
          <MessageBar intent="error">
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        )}

        {step === 'email' ? (
          <form className="form-stack" onSubmit={submitEmail}>
            <Field label="Электронная почта" required>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(_, data) => setEmail(data.value)}
                placeholder="admin@example.com"
              />
            </Field>
            <Button type="submit" appearance="primary" icon={<ArrowRightRegular />} iconPosition="after" disabled={busy}>
              {busy ? 'Отправляем' : 'Получить код'}
            </Button>
          </form>
        ) : (
          <form className="form-stack" onSubmit={submitCode}>
            <Field label="Код из письма" required hint={`Код отправлен на ${email}`}>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(_, data) => setCode(data.value.replace(/\D/g, ''))}
              />
            </Field>
            {debugCode && (
              <MessageBar intent="info">
                <MessageBarBody>Локальный тестовый код: <strong>{debugCode}</strong></MessageBarBody>
              </MessageBar>
            )}
            <Button type="submit" appearance="primary" disabled={busy || code.length !== 6}>
              {busy ? 'Проверяем' : 'Войти'}
            </Button>
            <Button type="button" appearance="subtle" onClick={() => { setStep('email'); setCode(''); setError('') }}>
              Изменить почту
            </Button>
          </form>
        )}
      </Card>
    </main>
  )
}
