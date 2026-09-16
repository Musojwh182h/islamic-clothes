const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:8102/api/v1/auth'

export type AuthUser = {
  id: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

type RequestCodeResponse = {
  message: string
  retry_after_seconds: number
  expires_in_seconds: number
  debug_code: string | null
}

type TokenResponse = {
  access_token: string
  token_type: 'bearer'
  expires_in: number
  user: AuthUser
}

let accessToken: string | null = null

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>
  const body = await response.json().catch(() => null) as { detail?: string | Array<{ msg?: string }> } | null
  const detail = body?.detail
  const message = typeof detail === 'string'
    ? detail
    : Array.isArray(detail)
      ? detail.map(item => item.msg).filter(Boolean).join(', ')
      : 'Не удалось связаться с сервисом авторизации'
  throw new Error(message)
}

export async function requestLoginCode(email: string): Promise<RequestCodeResponse> {
  const response = await fetch(`${AUTH_API_URL}/request-code`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return parseResponse<RequestCodeResponse>(response)
}

export async function verifyLoginCode(email: string, code: string): Promise<TokenResponse> {
  const response = await fetch(`${AUTH_API_URL}/verify-code`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  const result = await parseResponse<TokenResponse>(response)
  accessToken = result.access_token
  return result
}

export async function refreshAuthSession(): Promise<TokenResponse> {
  const response = await fetch(`${AUTH_API_URL}/refresh`, { method: 'POST', credentials: 'include' })
  const result = await parseResponse<TokenResponse>(response)
  accessToken = result.access_token
  return result
}

export async function logoutAuthSession(): Promise<void> {
  await fetch(`${AUTH_API_URL}/logout`, { method: 'POST', credentials: 'include' })
  accessToken = null
}

export function getAccessToken(): string | null {
  return accessToken
}
