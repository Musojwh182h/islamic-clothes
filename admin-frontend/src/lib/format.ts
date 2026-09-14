import type { OrderStatus } from '../types'

export const orderStatusLabels: Record<OrderStatus, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  assembling: 'Собирается',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
}

export const paymentStatusLabels: Record<string, string> = {
  pending: 'Ожидает оплаты',
  waiting: 'Проверяется',
  paid: 'Оплачен',
  cancelled: 'Отменён',
  refunded: 'Возвращён',
}

export function formatRoubles(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(
    kopecks / 100,
  )
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function formatPhone(value: string): string {
  const match = value.match(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/)
  return match ? `+7 ${match[1]} ${match[2]}-${match[3]}-${match[4]}` : value
}
