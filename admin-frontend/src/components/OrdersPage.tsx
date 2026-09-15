import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Skeleton,
  SkeletonItem,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Title1,
} from '@fluentui/react-components'
import { ArrowClockwiseRegular, OpenRegular, SearchRegular } from '@fluentui/react-icons'

import { formatDate, formatRoubles, orderStatusLabels, paymentStatusLabels } from '../lib/format'
import { AdminApi, ApiError } from '../services/api'
import type { AdminOrder, OrderStatus } from '../types'
import { OrderDialog } from './OrderDialog'

const statuses: OrderStatus[] = ['new', 'confirmed', 'assembling', 'shipped', 'delivered', 'cancelled']

export function OrdersPage({ api }: { api: AdminApi }) {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<AdminOrder | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const page = await api.listOrders(appliedQuery, statusFilter)
      setOrders(page.items)
      setTotal(page.total)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось загрузить заказы')
    } finally {
      setLoading(false)
    }
  }, [api, appliedQuery, statusFilter])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void load() }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [load])

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <Title1>Заказы</Title1>
          <Text block className="muted-copy">{total} заказов</Text>
        </div>
        <Button appearance="subtle" icon={<ArrowClockwiseRegular />} onClick={load}>Обновить</Button>
      </header>

      <section className="toolbar orders-toolbar" aria-label="Фильтры заказов">
        <Field label="Номер заказа или телефон" className="search-field">
          <Input
            contentBefore={<SearchRegular />}
            value={query}
            onChange={(_, data) => setQuery(data.value)}
            onKeyDown={event => { if (event.key === 'Enter') setAppliedQuery(query) }}
          />
        </Field>
        <Field label="Статус" className="status-filter">
          <Dropdown
            value={statusFilter ? orderStatusLabels[statusFilter] : 'Все статусы'}
            selectedOptions={[statusFilter]}
            onOptionSelect={(_, data) => setStatusFilter((data.optionValue ?? '') as OrderStatus | '')}
          >
            <Option value="">Все статусы</Option>
            {statuses.map(value => <Option key={value} value={value}>{orderStatusLabels[value]}</Option>)}
          </Dropdown>
        </Field>
        <Button appearance="secondary" onClick={() => setAppliedQuery(query)}>Найти</Button>
      </section>

      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}

      <section className="data-surface" aria-live="polite">
        {loading ? (
          <Skeleton className="table-skeleton" aria-label="Загрузка заказов">
            {Array.from({ length: 6 }, (_, index) => <SkeletonItem key={index} />)}
          </Skeleton>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <Text weight="semibold" size={500}>Заказов пока нет</Text>
            <Text block className="muted-copy">Здесь появятся заказы покупателей. Если включены фильтры, попробуйте изменить условия поиска.</Text>
          </div>
        ) : (
          <div className="table-scroll">
            <Table size="small" aria-label="Список заказов">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Заказ</TableHeaderCell>
                  <TableHeaderCell>Покупатель</TableHeaderCell>
                  <TableHeaderCell>Создан</TableHeaderCell>
                  <TableHeaderCell>Сумма</TableHeaderCell>
                  <TableHeaderCell>Оплата</TableHeaderCell>
                  <TableHeaderCell>Статус</TableHeaderCell>
                  <TableHeaderCell aria-label="Действия" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell><Text weight="semibold">{order.number}</Text></TableCell>
                    <TableCell><Text block>{order.recipient_name}</Text><Text size={200} className="muted-copy">{order.customer_phone}</Text></TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell className="numeric-cell">{formatRoubles(order.total_kopecks)}</TableCell>
                    <TableCell><Badge color={order.payment_status === 'paid' ? 'success' : 'warning'}>{paymentStatusLabels[order.payment_status] ?? order.payment_status}</Badge></TableCell>
                    <TableCell><Badge appearance="filled" color={order.status === 'cancelled' ? 'danger' : order.status === 'delivered' ? 'success' : 'informative'}>{orderStatusLabels[order.status]}</Badge></TableCell>
                    <TableCell><Button appearance="subtle" icon={<OpenRegular />} onClick={() => setSelected(order)}>Открыть</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <OrderDialog
        api={api}
        order={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        onSaved={updated => {
          setSelected(updated)
          setOrders(current => current.map(order => order.id === updated.id ? updated : order))
        }}
      />
    </main>
  )
}
