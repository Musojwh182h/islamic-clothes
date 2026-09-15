import { ArrowLeft, ChevronDown, PackageOpen, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  getMyOrder,
  listMyOrders,
  OrderError,
  type CustomerOrder,
  type CustomerOrderSummary,
  type OrderStatus,
} from '../services/orders'

const statusLabels: Record<OrderStatus, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  assembling: 'Собирается',
  shipped: 'Передан в доставку',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
}

const paymentLabels: Record<string, string> = {
  pending: 'Ожидает оплаты',
  waiting: 'Ожидает оплаты',
  paid: 'Оплачен',
  succeeded: 'Оплачен',
  cancelled: 'Оплата отменена',
  refunded: 'Возврат выполнен',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatRoubles(kopecks: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(kopecks / 100)
}

type Props = {
  onBack: () => void
  onSessionExpired: () => void
}

export function CustomerOrders({ onBack, onSessionExpired }: Props) {
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([])
  const [total, setTotal] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, CustomerOrder>>({})
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [error, setError] = useState('')

  async function loadOrders() {
    setLoading(true)
    setError('')
    try {
      const page = await listMyOrders()
      setOrders(page.items)
      setTotal(page.total)
    } catch (reason) {
      if (reason instanceof OrderError && reason.status === 401) {
        onSessionExpired()
        return
      }
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить историю заказов')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadOrders() }, [])

  async function toggleOrder(orderId: string) {
    if (selectedId === orderId) {
      setSelectedId(null)
      return
    }
    setSelectedId(orderId)
    if (details[orderId]) return
    setLoadingDetails(true)
    setError('')
    try {
      const detail = await getMyOrder(orderId)
      setDetails(current => ({ ...current, [orderId]: detail }))
    } catch (reason) {
      if (reason instanceof OrderError && reason.status === 401) {
        onSessionExpired()
        return
      }
      setSelectedId(null)
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить заказ')
    } finally {
      setLoadingDetails(false)
    }
  }

  return (
    <div className="customer-orders-view">
      <div className="customer-orders-head">
        <button className="auth-back" type="button" onClick={onBack}><ArrowLeft size={15} /> Личный кабинет</button>
        <button className="orders-refresh" type="button" onClick={() => void loadOrders()} disabled={loading} aria-label="Обновить заказы"><RefreshCw size={16} /></button>
      </div>
      <p className="eyebrow">ИСТОРИЯ ПОКУПОК</p>
      <h2 id="auth-title">Мои заказы.</h2>
      <p className="auth-description">Здесь отображаются ваши покупки и их текущие статусы.</p>

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? (
        <div className="orders-loading" role="status">Загружаем заказы…</div>
      ) : orders.length === 0 ? (
        <div className="orders-empty">
          <PackageOpen size={30} />
          <strong>Заказов пока нет</strong>
          <span>После оформления покупки она появится здесь.</span>
        </div>
      ) : (
        <div className="customer-orders-list">
          <span className="orders-count">{total} {total === 1 ? 'заказ' : total < 5 ? 'заказа' : 'заказов'}</span>
          {orders.map(order => {
            const detail = details[order.id]
            const isOpen = selectedId === order.id
            return (
              <article className={`customer-order ${isOpen ? 'is-expanded' : ''}`} key={order.id}>
                <button className="customer-order-summary" type="button" onClick={() => void toggleOrder(order.id)} aria-expanded={isOpen}>
                  <span className="order-summary-main">
                    <strong>{order.number}</strong>
                    <small>{formatDate(order.created_at)}</small>
                  </span>
                  <span className={`customer-status status-${order.status}`}>{statusLabels[order.status]}</span>
                  <span className="order-summary-meta">
                    <strong>{formatRoubles(order.total_kopecks)}</strong>
                    <small>{order.item_count} шт.</small>
                  </span>
                  <ChevronDown className="order-chevron" size={18} />
                </button>

                {isOpen && (
                  <div className="customer-order-detail">
                    {loadingDetails && !detail ? <p role="status">Загружаем состав…</p> : detail && (
                      <>
                        <div className="customer-order-items">
                          {detail.items.map(item => (
                            <div key={item.id}>
                              <span><strong>{item.product_name}</strong><small>Размер {item.size} · {item.sku}</small></span>
                              <span>{item.quantity} × {formatRoubles(item.unit_price_kopecks)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="customer-order-delivery">
                          <span><small>Получатель</small><strong>{detail.recipient_name}</strong></span>
                          <span><small>Доставка</small><strong>{Object.values(detail.delivery_address).filter(Boolean).join(', ')}</strong></span>
                          <span><small>Оплата</small><strong>{paymentLabels[detail.payment_status] ?? detail.payment_status}</strong></span>
                        </div>
                        <ol className="customer-order-timeline" aria-label="История статусов">
                          {detail.history.map(entry => (
                            <li key={entry.id}>
                              <i />
                              <span><strong>{statusLabels[entry.to_status]}</strong><small>{formatDate(entry.created_at)}</small></span>
                            </li>
                          ))}
                        </ol>
                      </>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
