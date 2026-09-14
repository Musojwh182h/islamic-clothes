import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
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
import { AddRegular, ArrowClockwiseRegular, EditRegular, SearchRegular } from '@fluentui/react-icons'

import { formatRoubles } from '../lib/format'
import { AdminApi, ApiError } from '../services/api'
import type { AdminProduct } from '../types'
import { ProductDialog } from './ProductDialog'

export function ProductsPage({ api }: { api: AdminApi }) {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<AdminProduct | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const page = await api.listProducts(appliedQuery)
      setProducts(page.items)
      setTotal(page.total)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось загрузить товары')
    } finally {
      setLoading(false)
    }
  }, [api, appliedQuery])

  useEffect(() => { void load() }, [load])

  function openCreate() {
    setSelected(null)
    setDialogOpen(true)
  }

  function openEdit(product: AdminProduct) {
    setSelected(product)
    setDialogOpen(true)
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <Title1>Товары</Title1>
          <Text block className="muted-copy">{total} позиций в каталоге</Text>
        </div>
        <Button appearance="primary" icon={<AddRegular />} onClick={openCreate}>Добавить товар</Button>
      </header>

      <section className="toolbar" aria-label="Фильтры товаров">
        <Field label="Поиск товаров" className="search-field">
          <Input
            contentBefore={<SearchRegular />}
            value={query}
            onChange={(_, data) => setQuery(data.value)}
            onKeyDown={event => { if (event.key === 'Enter') setAppliedQuery(query) }}
          />
        </Field>
        <Button appearance="secondary" onClick={() => setAppliedQuery(query)}>Найти</Button>
        <Button appearance="subtle" icon={<ArrowClockwiseRegular />} onClick={load}>Обновить</Button>
      </section>

      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}

      <section className="data-surface" aria-live="polite">
        {loading ? (
          <TableSkeleton />
        ) : products.length === 0 ? (
          <div className="empty-state">
            <Text weight="semibold" size={500}>Товары не найдены</Text>
            <Text block className="muted-copy">Измените запрос или добавьте первую позицию.</Text>
            <Button appearance="primary" icon={<AddRegular />} onClick={openCreate}>Добавить товар</Button>
          </div>
        ) : (
          <div className="table-scroll">
            <Table size="small" aria-label="Список товаров">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Товар</TableHeaderCell>
                  <TableHeaderCell>Категория</TableHeaderCell>
                  <TableHeaderCell>Цена</TableHeaderCell>
                  <TableHeaderCell>Размеры</TableHeaderCell>
                  <TableHeaderCell>Остаток</TableHeaderCell>
                  <TableHeaderCell>Статус</TableHeaderCell>
                  <TableHeaderCell aria-label="Действия" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(product => {
                  const variants = product.variants.filter(variant => variant.is_active)
                  const stock = variants.reduce((sum, variant) => sum + variant.stock_quantity, 0)
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="product-cell">
                          {product.images[0] ? (
                            <img src={product.images[0].url} alt="" />
                          ) : (
                            <div className="table-image-empty" aria-hidden="true" />
                          )}
                          <div>
                            <Text block weight="semibold">{product.name}</Text>
                            <Text size={200} className="muted-copy">{product.slug}</Text>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell className="numeric-cell">{formatRoubles(product.price_kopecks)}</TableCell>
                      <TableCell>{variants.map(variant => variant.size).join(', ') || 'Нет'}</TableCell>
                      <TableCell className="numeric-cell stock-cell" data-low={stock <= 5}>{stock}</TableCell>
                      <TableCell>
                        <Badge appearance="filled" color={product.is_active ? 'success' : 'informative'}>
                          {product.is_active ? 'Активен' : 'Скрыт'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button appearance="subtle" icon={<EditRegular />} onClick={() => openEdit(product)}>
                          Изменить
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <ProductDialog
        api={api}
        open={dialogOpen}
        product={selected}
        onClose={() => setDialogOpen(false)}
        onSaved={() => { setDialogOpen(false); void load() }}
      />
    </main>
  )
}

function TableSkeleton() {
  return (
    <Skeleton className="table-skeleton" aria-label="Загрузка товаров">
      {Array.from({ length: 6 }, (_, index) => <SkeletonItem key={index} />)}
    </Skeleton>
  )
}
