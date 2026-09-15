import { getAccessToken, refreshAuthSession } from './auth'
import type { CartItem } from '../types/product'

const API = import.meta.env.VITE_ORDERS_API_URL ?? 'http://localhost:8103/api/v1/orders'
export type DeliveryDetails = { recipient_name: string; phone: string; city: string; address: string }
export class OrderError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export async function createOrder(items: CartItem[], details: DeliveryDetails, key: string) {
  const send = () => fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key,
      ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}) },
    body: JSON.stringify({ ...details, items: items.map(item => ({
      product_id: item.id, slug: item.slug, size: item.size, quantity: item.quantity,
    })) }),
  })
  let response = await send()
  if (response.status === 401) {
    try { await refreshAuthSession() } catch { throw new OrderError('Для оформления заказа войдите снова', 401) }
    response = await send()
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new OrderError(typeof data?.detail === 'string' ? data.detail : 'Проверьте данные получателя и состав корзины', response.status)
  return data as { id: string; number: string; total_kopecks: number }
}
