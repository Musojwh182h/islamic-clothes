import { useEffect, useState } from 'react'
import { Button, MessageBar, MessageBarBody, Skeleton, SkeletonItem, Text, Title1 } from '@fluentui/react-components'
import { ArrowRightRegular } from '@fluentui/react-icons'

import { formatRoubles } from '../lib/format'
import { AdminApi, ApiError } from '../services/api'
import type { AdminOrder, AdminProduct } from '../types'

type OverviewPageProps = {
  api: AdminApi
  onNavigate: (page: 'products' | 'orders') => void
}

export function OverviewPage({ api, onNavigate }: OverviewPageProps) {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([api.listProducts(), api.listOrders()])
      .then(([productPage, orderPage]) => {
        if (!active) return
        setProducts(productPage.items)
        setOrders(orderPage.items)
      })
      .catch(reason => {
        if (active) setError(reason instanceof ApiError ? reason.message : 'Не удалось загрузить сводку')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [api])

  const activeProducts = products.filter(product => product.is_active).length
  const lowStock = products.filter(product =>
    product.variants.filter(variant => variant.is_active).reduce((sum, variant) => sum + variant.stock_quantity, 0) <= 5,
  ).length
  const openOrders = orders.filter(order => !['delivered', 'cancelled'].includes(order.status)).length
  const turnover = orders
    .filter(order => order.payment_status === 'paid')
    .reduce((sum, order) => sum + order.total_kopecks, 0)

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <Title1>Обзор магазина</Title1>
          <Text block className="muted-copy">Состояние каталога и заказов на текущий момент.</Text>
        </div>
      </header>

      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}

      {loading ? (
        <Skeleton className="metrics-loading" aria-label="Загрузка сводки">
          <SkeletonItem /><SkeletonItem /><SkeletonItem /><SkeletonItem />
        </Skeleton>
      ) : (
        <section className="metrics-grid" aria-label="Основные показатели">
          <Metric label="Активные товары" value={String(activeProducts)} />
          <Metric label="Малый остаток" value={String(lowStock)} />
          <Metric label="Заказы в работе" value={String(openOrders)} />
          <Metric label="Оплачено" value={formatRoubles(turnover)} />
        </section>
      )}

      <section className="overview-actions">
        <div>
          <Text weight="semibold" size={500}>Каталог</Text>
          <Text block className="muted-copy">Цены, размеры, изображения и доступность товаров.</Text>
          <Button appearance="primary" icon={<ArrowRightRegular />} iconPosition="after" onClick={() => onNavigate('products')}>
            Открыть товары
          </Button>
        </div>
        <div>
          <Text weight="semibold" size={500}>Заказы</Text>
          <Text block className="muted-copy">Покупатели, состав заказа и история статусов.</Text>
          <Button appearance="secondary" icon={<ArrowRightRegular />} iconPosition="after" onClick={() => onNavigate('orders')}>
            Открыть заказы
          </Button>
        </div>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <Text className="metric-label">{label}</Text>
      <Text block className="metric-value">{value}</Text>
    </div>
  )
}
