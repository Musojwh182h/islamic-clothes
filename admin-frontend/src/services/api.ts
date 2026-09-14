import type {
  AdminOrder,
  AdminProduct,
  AuthSession,
  MediaObject,
  OrderPage,
  OrderStatus,
  ProductPage,
  ProductPayload,
} from '../types'

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:8102/api/v1/auth'
const CATALOG_ADMIN_API_URL = import.meta.env.VITE_CATALOG_ADMIN_API_URL ?? 'http://localhost:8101/api/v1/admin/catalog'
const ORDERS_ADMIN_API_URL = import.meta.env.VITE_ORDERS_ADMIN_API_URL ?? 'http://localhost:8103/api/v1/admin/orders'
const MEDIA_API_URL = import.meta.env.VITE_MEDIA_API_URL ?? 'http://localhost:8104/api/v1/media'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
  }
}

function errorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object' || !('detail' in payload)) return fallback
  const detail = payload.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map(item => (typeof item === 'object' && item && 'msg' in item ? String(item.msg) : String(item))).join('; ')
  }
  return fallback
}

export class AdminApi {
  private accessToken: string | null = null

  constructor(private readonly onSessionExpired: () => void) {}

  async restoreSession(): Promise<AuthSession | null> {
    try {
      const session = await this.refreshSession()
      if (session.user.role !== 'admin' || !session.user.is_active) {
        await this.logout()
        return null
      }
      return session
    } catch {
      this.accessToken = null
      return null
    }
  }

  async requestCode(phone: string): Promise<{ debug_code?: string | null; retry_after_seconds: number }> {
    return this.publicRequest(`${AUTH_API_URL}/request-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
  }

  async verifyCode(phone: string, code: string): Promise<AuthSession> {
    const session = await this.publicRequest<AuthSession>(`${AUTH_API_URL}/verify-code`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    })
    if (session.user.role !== 'admin' || !session.user.is_active) {
      this.accessToken = session.access_token
      await this.logout()
      throw new ApiError('У этой учётной записи нет прав администратора', 403)
    }
    this.accessToken = session.access_token
    return session
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${AUTH_API_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : undefined,
      })
    } finally {
      this.accessToken = null
    }
  }

  async listProducts(query = '', offset = 0): Promise<ProductPage> {
    const params = new URLSearchParams({ offset: String(offset), limit: '50' })
    if (query.trim()) params.set('query', query.trim())
    return this.request(`${CATALOG_ADMIN_API_URL}/products?${params}`)
  }

  async createProduct(payload: ProductPayload): Promise<AdminProduct> {
    return this.request(`${CATALOG_ADMIN_API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  async updateProduct(productId: string, payload: ProductPayload): Promise<AdminProduct> {
    return this.request(`${CATALOG_ADMIN_API_URL}/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  async updateStock(productId: string, variantId: string, stockQuantity: number): Promise<AdminProduct> {
    return this.request(`${CATALOG_ADMIN_API_URL}/products/${productId}/variants/${variantId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_quantity: stockQuantity }),
    })
  }

  async uploadImage(file: File): Promise<MediaObject> {
    const form = new FormData()
    form.append('file', file)
    return this.request(`${MEDIA_API_URL}/images`, { method: 'POST', body: form })
  }

  async listOrders(query = '', status: OrderStatus | '' = '', offset = 0): Promise<OrderPage> {
    const params = new URLSearchParams({ offset: String(offset), limit: '50' })
    if (query.trim()) params.set('query', query.trim())
    if (status) params.set('order_status', status)
    return this.request(`${ORDERS_ADMIN_API_URL}?${params}`)
  }

  async updateOrderStatus(
    order: AdminOrder,
    nextStatus: OrderStatus,
    comment: string,
  ): Promise<AdminOrder> {
    return this.request(`${ORDERS_ADMIN_API_URL}/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: nextStatus,
        comment,
        expected_updated_at: order.updated_at,
      }),
    })
  }

  private async refreshSession(): Promise<AuthSession> {
    const session = await this.publicRequest<AuthSession>(`${AUTH_API_URL}/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    this.accessToken = session.access_token
    return session
  }

  private async request<T>(url: string, init: RequestInit = {}, canRetry = true): Promise<T> {
    const headers = new Headers(init.headers)
    if (this.accessToken) headers.set('Authorization', `Bearer ${this.accessToken}`)
    const response = await fetch(url, { ...init, headers, credentials: 'include' })
    if (response.status === 401 && canRetry) {
      try {
        await this.refreshSession()
        return this.request<T>(url, init, false)
      } catch {
        this.accessToken = null
        this.onSessionExpired()
        throw new ApiError('Сессия завершена. Войдите снова', 401)
      }
    }
    return this.parseResponse<T>(response)
  }

  private async publicRequest<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, init)
    return this.parseResponse<T>(response)
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const payload = response.status === 204 ? undefined : await response.json().catch(() => undefined)
    if (!response.ok) throw new ApiError(errorMessage(payload, `Ошибка API: ${response.status}`), response.status)
    return payload as T
  }
}
