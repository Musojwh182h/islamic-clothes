import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  MessageBar,
  MessageBarBody,
  Option,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Textarea,
} from '@fluentui/react-components'

import { formatDate, formatRoubles, orderStatusLabels, paymentStatusLabels } from '../lib/format'
import { AdminApi, ApiError } from '../services/api'
import type { AdminOrder, OrderStatus } from '../types'

const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['assembling', 'cancelled'],
  assembling: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

type OrderDialogProps = {
  api: AdminApi
  order: AdminOrder | null
  open: boolean
  onClose: () => void
  onSaved: (order: AdminOrder) => void
}

export function OrderDialog({ api, order, open, onClose, onSaved }: OrderDialogProps) {
  const options = useMemo(() => order ? nextStatuses[order.status] : [], [order])
  const [statusValue, setStatusValue] = useState<OrderStatus | ''>('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setStatusValue(options[0] ?? '')
    setComment('')
    setError('')
  }, [order, options])

  if (!order) return null
  const selectedOrder = order

  async function saveStatus() {
    if (!statusValue) return
    setSaving(true)
    setError('')
    try {
      onSaved(await api.updateOrderStatus(selectedOrder, statusValue, comment))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось изменить статус')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => { if (!data.open && !saving) onClose() }}>
      <DialogSurface className="order-dialog">
        <DialogBody>
          <DialogTitle>Заказ {order.number}</DialogTitle>
          <DialogContent className="dialog-scroll order-content">
            {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}

            <section className="order-summary">
              <div><Text className="detail-label">Покупатель</Text><Text block weight="semibold">{order.recipient_name}</Text></div>
              <div><Text className="detail-label">Телефон</Text><Text block>{order.customer_phone}</Text></div>
              <div><Text className="detail-label">Создан</Text><Text block>{formatDate(order.created_at)}</Text></div>
              <div><Text className="detail-label">Оплата</Text><Badge color={order.payment_status === 'paid' ? 'success' : 'warning'}>{paymentStatusLabels[order.payment_status] ?? order.payment_status}</Badge></div>
              <div><Text className="detail-label">Доставка</Text><Text block>{order.delivery_method}</Text></div>
              <div><Text className="detail-label">Адрес</Text><Text block>{Object.values(order.delivery_address).filter(Boolean).join(', ') || 'Не указан'}</Text></div>
            </section>

            <section className="form-section">
              <Text block weight="semibold" size={400}>Состав заказа</Text>
              <div className="table-scroll">
                <Table size="small" aria-label="Состав заказа">
                  <TableHeader><TableRow><TableHeaderCell>Товар</TableHeaderCell><TableHeaderCell>Размер</TableHeaderCell><TableHeaderCell>Количество</TableHeaderCell><TableHeaderCell>Сумма</TableHeaderCell></TableRow></TableHeader>
                  <TableBody>
                    {order.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell><Text block weight="semibold">{item.product_name}</Text><Text size={200} className="muted-copy">{item.sku}</Text></TableCell>
                        <TableCell>{item.size}</TableCell>
                        <TableCell className="numeric-cell">{item.quantity}</TableCell>
                        <TableCell className="numeric-cell">{formatRoubles(item.line_total_kopecks)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="order-total"><Text>Итого</Text><Text weight="semibold" size={500}>{formatRoubles(order.total_kopecks)}</Text></div>
            </section>

            <section className="form-section">
              <Text block weight="semibold" size={400}>История статусов</Text>
              {order.history.length === 0 ? <div className="compact-empty">История пока пуста.</div> : (
                <ol className="history-list">
                  {order.history.map(entry => (
                    <li key={entry.id}>
                      <div><Text weight="semibold">{orderStatusLabels[entry.to_status as OrderStatus] ?? entry.to_status}</Text><Text block size={200} className="muted-copy">{formatDate(entry.created_at)}</Text></div>
                      {entry.comment && <Text>{entry.comment}</Text>}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="form-section">
              <Text block weight="semibold" size={400}>Изменить статус</Text>
              {options.length === 0 ? (
                <div className="compact-empty">Для текущего статуса дальнейшие переходы недоступны.</div>
              ) : (
                <div className="status-form">
                  <Field label="Следующий статус" required>
                    <Dropdown
                      value={statusValue ? orderStatusLabels[statusValue] : ''}
                      selectedOptions={statusValue ? [statusValue] : []}
                      onOptionSelect={(_, data) => setStatusValue((data.optionValue ?? '') as OrderStatus | '')}
                    >
                      {options.map(value => <Option key={value} value={value}>{orderStatusLabels[value]}</Option>)}
                    </Dropdown>
                  </Field>
                  <Field label="Комментарий" hint="Будет сохранён в истории заказа">
                    <Textarea resize="vertical" value={comment} onChange={(_, data) => setComment(data.value)} />
                  </Field>
                </div>
              )}
            </section>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose} disabled={saving}>Закрыть</Button>
            {options.length > 0 && <Button appearance="primary" onClick={saveStatus} disabled={saving || !statusValue}>{saving ? 'Сохраняем' : 'Изменить статус'}</Button>}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
