import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Select,
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
import { AddRegular, ArrowClockwiseRegular, DeleteRegular, EditRegular, EyeOffRegular, EyeRegular, SearchRegular, TagRegular } from '@fluentui/react-icons'

import { formatRoubles } from '../lib/format'
import { AdminApi, ApiError } from '../services/api'
import type { AdminProduct, ProductCategory } from '../types'
import { CategoryDialog } from './CategoryDialog'
import { ProductDialog } from './ProductDialog'

type ProductVisibility = 'active' | 'archived' | 'all'

export function ProductsPage({ api }: { api: AdminApi }) {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [selected, setSelected] = useState<AdminProduct | null>(null)
  const [visibility, setVisibility] = useState<ProductVisibility>('active')
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [visibilityBusyId, setVisibilityBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const isActive = visibility === 'all' ? undefined : visibility === 'active'
      const page = await api.listProducts(appliedQuery, 0, isActive)
      setProducts(page.items)
      setTotal(page.total)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось загрузить товары')
    } finally {
      setLoading(false)
    }
  }, [api, appliedQuery, visibility])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    api.listCategories()
      .then(setCategories)
      .catch(reason => setError(reason instanceof ApiError ? reason.message : 'Не удалось загрузить категории'))
  }, [api])

  function openCreate() {
    setSelected(null)
    setDialogOpen(true)
  }

  function openEdit(product: AdminProduct) {
    setSelected(product)
    setDialogOpen(true)
  }

  function openDelete(product: AdminProduct) {
    setDeleteError('')
    setDeleteTarget(product)
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await api.deleteProduct(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (reason) {
      setDeleteError(reason instanceof ApiError ? reason.message : 'Не удалось удалить товар')
    } finally {
      setDeleting(false)
    }
  }

  async function toggleVisibility(product: AdminProduct) {
    if (visibilityBusyId) return
    setVisibilityBusyId(product.id)
    setError('')
    try {
      await api.setProductVisibility(product, !product.is_active)
      await load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось изменить видимость товара')
    } finally {
      setVisibilityBusyId(null)
    }
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <Title1>Товары</Title1>
          <Text block className="muted-copy">
            {total} {visibility === 'archived' ? 'скрытых товаров' : visibility === 'all' ? 'товаров всего' : 'товаров на сайте'}
          </Text>
        </div>
        <div className="page-header-actions">
          <Button appearance="secondary" icon={<TagRegular />} onClick={() => setCategoryDialogOpen(true)}>Добавить категорию</Button>
          <Button appearance="primary" icon={<AddRegular />} onClick={openCreate} disabled={categories.length === 0}>Добавить товар</Button>
        </div>
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
        <Field label="Показывать" className="status-filter">
          <Select
            value={visibility}
            onChange={event => setVisibility(event.target.value as ProductVisibility)}
          >
            <option value="active">Активные товары</option>
            <option value="archived">Скрытые товары</option>
            <option value="all">Все товары</option>
          </Select>
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
            <Text weight="semibold" size={500}>{visibility === 'archived' ? 'Скрытых товаров нет' : 'Товары не найдены'}</Text>
            <Text block className="muted-copy">
              {visibility === 'archived'
                ? 'Скрытые и удалённые товары появятся здесь. Их можно отредактировать или снова показать на сайте.'
                : 'Измените запрос или добавьте первую позицию.'}
            </Text>
            {visibility !== 'archived' && (
              <Button appearance="primary" icon={<AddRegular />} onClick={openCreate}>Добавить товар</Button>
            )}
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
                        <div className="table-actions">
                          <Button
                            appearance="subtle"
                            icon={product.is_active ? <EyeOffRegular /> : <EyeRegular />}
                            disabled={visibilityBusyId === product.id}
                            onClick={() => void toggleVisibility(product)}
                          >
                            {visibilityBusyId === product.id ? 'Сохраняем…' : product.is_active ? 'Скрыть' : 'Показать'}
                          </Button>
                          <Button appearance="subtle" icon={<EditRegular />} onClick={() => openEdit(product)}>
                            Изменить
                          </Button>
                          {product.is_active && (
                            <Button
                              appearance="subtle"
                              className="danger-action"
                              icon={<DeleteRegular />}
                              onClick={() => openDelete(product)}
                            >
                              Удалить
                            </Button>
                          )}
                        </div>
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
        categories={categories}
        onClose={() => setDialogOpen(false)}
        onSaved={() => { setDialogOpen(false); void load() }}
      />

      <CategoryDialog
        api={api}
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        onCreated={category => {
          setCategories(current => [...current, category].sort((left, right) => left.name.localeCompare(right.name, 'ru')))
          setCategoryDialogOpen(false)
        }}
      />

      {deleteTarget && (
        <div className="admin-modal-layer">
          <button
            type="button"
            className="admin-modal-backdrop"
            aria-label="Закрыть подтверждение удаления"
            onClick={() => { if (!deleting) setDeleteTarget(null) }}
          />
          <section
            className="admin-modal-surface delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
            aria-describedby="delete-product-description"
          >
            <div>
              <h2 id="delete-product-title">Удалить товар?</h2>
              <Text id="delete-product-description" block className="muted-copy">
                «{deleteTarget.name}» исчезнет из магазина и будет перенесён в архив. Старые заказы и изображения сохранятся.
              </Text>
            </div>
            {deleteError && <MessageBar intent="error"><MessageBarBody>{deleteError}</MessageBarBody></MessageBar>}
            <div className="admin-modal-actions">
              <Button autoFocus disabled={deleting} onClick={() => setDeleteTarget(null)}>Отмена</Button>
              <Button
                appearance="primary"
                className="delete-confirm-button"
                icon={<DeleteRegular />}
                disabled={deleting}
                onClick={() => void confirmDelete()}
              >
                {deleting ? 'Удаляем…' : 'Удалить товар'}
              </Button>
            </div>
          </section>
        </div>
      )}
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
