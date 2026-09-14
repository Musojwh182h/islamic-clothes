import { useEffect, useRef, useState } from 'react'
import { FluentProvider, Spinner } from '@fluentui/react-components'

import { AdminShell } from './components/AdminShell'
import { LoginPage } from './components/LoginPage'
import { AdminApi } from './services/api'
import { sabrDarkTheme, sabrLightTheme } from './theme'
import type { AuthSession } from './types'

function usePrefersDarkMode() {
  const [isDark, setIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const update = (event: MediaQueryListEvent) => setIsDark(event.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return isDark
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [initializing, setInitializing] = useState(true)
  const apiRef = useRef<AdminApi | null>(null)
  if (!apiRef.current) apiRef.current = new AdminApi(() => setSession(null))
  const api = apiRef.current
  const isDark = usePrefersDarkMode()

  useEffect(() => {
    let active = true
    api.restoreSession()
      .then(restored => { if (active) setSession(restored) })
      .finally(() => { if (active) setInitializing(false) })
    return () => { active = false }
  }, [api])

  return (
    <FluentProvider theme={isDark ? sabrDarkTheme : sabrLightTheme} className="app-provider">
      {initializing ? (
        <main className="app-loading"><Spinner label="Проверяем сессию" /></main>
      ) : session ? (
        <AdminShell api={api} session={session} onLogout={() => setSession(null)} />
      ) : (
        <LoginPage api={api} onAuthenticated={setSession} />
      )}
    </FluentProvider>
  )
}
