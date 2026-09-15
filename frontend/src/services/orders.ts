import { getAccessToken, refreshAuthSession } from './auth'
import type { CartItem } from '../types/product'

const API = import.meta.env.VITE_ORDERS_API_URL ?? 'http://localhost:8103/api/v1/orders'
export type DeliveryDetails = { recipient_name: string; phone: string; city: string; address: string }
export type OrderStatus = 'new' | 'confirmed' | 'assembling' | 'shipped' | 'delivered' | 'cancelled'

export type CustomerOrderSummary = {
  id: string
  number: string
  status: OrderStatus
  payment_status: string
  total_kopecks: number
  currency: 'RUB'
  item_count: number
  created_at: string
  updated_at: string
}

export type CustomerOrder = Omit<CustomerOrderSummary, 'item_count'> & {
  recipient_name: string
  delivery_method: string
  delivery_address: Record<string, string>
  subtotal_kopecks: number
  delivery_kopecks: number
  items: Array<{
    id: string
    product_id: string
    sku: string
    product_name: string
    size: string
    unit_price_kopecks: number
    quantity: number
    line_total_kopecks: number
  }>
  history: Array<{
    id: string
    from_status: string | null
    to_status: OrderStatus
    created_at: string
  }>
}

type CustomerOrderPage = {
  items: CustomerOrderSummary[]
  total: number
  offset: number
  limit: number
}

export class OrderError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

async function authenticatedRequest(url: string, init: RequestInit = {}): Promise<Response> {
  const send = () => {
    const headers = new Headers(init.headers)
    const token = getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(url, { ...init, headers })
  }
  let response = await send()
  if (response.status === 401) {
    try { await refreshAuthSession() } catch { throw new OrderError('Сессия завершена. Войдите снова', 401) }
    response = await send()
  }
  return response
}

async function parseOrderResponse<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new OrderError(typeof data?.detail === 'string' ? data.detail : fallback, response.status)
  return data as T
}

export async function createOrder(items: CartItem[], details: DeliveryDetails, key: string) {
  const response = await authenticatedRequest(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({ ...details, items: items.map(item => ({
      product_id: item.id, slug: item.slug, size: item.size, quantity: item.quantity,
    })) }),
  })
  return parseOrderResponse<{ id: string; number: string; total_kopecks: number }>(
    response,
    'Проверьте данные получателя и состав корзины',
  )
}

export async function listMyOrders(offset = 0, limit = 10): Promise<CustomerOrderPage> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) })
  const response = await authenticatedRequest(`${API}?${params}`)
  return parseOrderResponse<CustomerOrderPage>(response, 'Не удалось загрузить историю заказов')
}

export async function getMyOrder(orderId: string): Promise<CustomerOrder> {
  const response = await authenticatedRequest(`${API}/${encodeURIComponent(orderId)}`)
  return parseOrderResponse<CustomerOrder>(response, 'Не удалось загрузить заказ')
}
