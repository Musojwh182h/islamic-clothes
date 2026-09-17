import { useEffect, useId, useState, type FormEvent } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Switch,
  Select,
  Text,
  Textarea,
} from '@fluentui/react-components'
import { AddRegular, DeleteRegular, ImageAddRegular } from '@fluentui/react-icons'

import { AdminApi, ApiError } from '../services/api'
import type { AdminProduct, ProductCategory, ProductPayload, ProductVariant } from '../types'
import { productAddress, productArticle } from '../lib/productForm'

type ProductDialogProps = {
  api: AdminApi
  open: boolean
  product: AdminProduct | null
  categories: ProductCategory[]
  onClose: () => void
  onSaved: (product: AdminProduct) => void
}

const emptyVariant = (index: number): ProductVariant => ({
  sku: '',
  size: '',
  stock_quantity: 0,
  sort_order: index,
  is_active: true,
})

function initialPayload(product: AdminProduct | null, categories: ProductCategory[]): ProductPayload {
  if (product) {
    return {
      slug: product.slug,
      name: product.name,
      description: product.description,
      category: product.category,
      price_kopecks: product.price_kopecks,
      color: product.color,
      material: product.material,
      tone: product.tone,
      is_active: product.is_active,
      is_new: product.is_new,
      variants: product.variants.map(variant => ({ ...variant })),
      images: product.images.map(({ url: _url, ...image }) => ({ ...image })),
      expected_updated_at: product.updated_at,
    }
  }
  return {
    slug: '',
    name: '',
    description: '',
    category: categories[0]?.name ?? '',
    price_kopecks: 0,
    color: '',
    material: '',
    tone: 'sand',
    is_active: true,
    is_new: false,
    variants: [emptyVariant(0)],
    images: [],
  }
}

export function ProductDialog({ api, open, product, categories, onClose, onSaved }: ProductDialogProps) {
  const formId = useId()
  const [draft, setDraft] = useState<ProductPayload>(() => initialPayload(product, categories))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [addressEdited, setAddressEdited] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setDraft(initialPayload(product, categories))
      setError('')
      setAddressEdited(Boolean(product))
      setPreviewUrls(Object.fromEntries((product?.images ?? []).map(image => [image.object_key, image.url])))
    }
  }, [categories, open, product])

  function setField<K extends keyof ProductPayload>(key: K, value: ProductPayload[K]) {
    setDraft(current => ({ ...current, [key]: value }))
  }

  function updateVariant(index: number, patch: Partial<ProductVariant>) {
    setDraft(current => ({
      ...current,
      variants: current.variants.map((variant, itemIndex) => itemIndex === index ? { ...variant, ...patch } : variant),
    }))
  }

  function removeVariant(index: number) {
    setDraft(current => ({ ...current, variants: current.variants.filter((_, itemIndex) => itemIndex !== index) }))
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const uploaded = await api.uploadImage(file)
      setPreviewUrls(current => ({ ...current, [uploaded.object_key]: uploaded.url }))
      setDraft(current => ({
        ...current,
        images: [
          ...current.images,
          {
            object_key: uploaded.object_key,
            alt_text: current.name,
            sort_order: current.images.length,
          },
        ],
      }))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось загрузить изображение')
    } finally {
      setUploading(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (productAddress(draft.slug).length < 3) {
      setError('Адрес товара должен содержать хотя бы 3 буквы или цифры. Например: belaya-dzhubba')
      return
    }
    if (!draft.name.trim() || !draft.category.trim()) {
      setError('Заполните название и категорию товара')
      return
    }
    if (draft.variants.length === 0) {
      setError('Добавьте хотя бы один размер')
      return
    }
    setSaving(true)
    try {
      const normalized: ProductPayload = {
        ...draft,
        slug: productAddress(draft.slug),
        price_kopecks: Math.round(draft.price_kopecks),
        variants: draft.variants.map((variant, index) => ({
          ...variant,
          sku: variant.sku.trim() ? productArticle(variant.sku) : `${productAddress(draft.slug).slice(0, 50)}-${productArticle(variant.size)}`.toUpperCase(),
          size: variant.size.trim().toUpperCase(),
          stock_quantity: Math.round(variant.stock_quantity),
          sort_order: index,
        })),
        images: draft.images.map((image, index) => ({ ...image, alt_text: image.alt_text.trim(), sort_order: index })),
      }
      const saved = product
        ? await api.updateProduct(product.id, normalized)
        : await api.createProduct(normalized)
      onSaved(saved)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось сохранить товар')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => { if (!data.open && !saving && !uploading) onClose() }}>
      <DialogSurface className="product-dialog">
        <DialogBody>
          <DialogTitle>{product ? 'Редактирование товара' : 'Новый товар'}</DialogTitle>
          <DialogContent className="dialog-scroll">
            {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
            <form id={formId} className="product-form" onSubmit={submit}>
              <section className="form-section">
                <Text weight="semibold" size={400}>Основные данные</Text>
                <div className="form-grid">
                  <Field label="Название" required>
                    <Input required minLength={2} maxLength={180} value={draft.name} onChange={(_, data) => { setField('name', data.value); if (!addressEdited) setField('slug', productAddress(data.value)) }} />
                  </Field>
                  <Field label="Адрес товара" required hint="Создаётся из названия. Русские буквы автоматически заменяются латинскими при выходе из поля.">
                    <Input required minLength={3} maxLength={120} value={draft.slug} onChange={(_, data) => { setAddressEdited(true); setField('slug', data.value) }} onBlur={() => setField('slug', productAddress(draft.slug))} />
                  </Field>
                  <Field label="Категория" required>
                    <Select value={draft.category} onChange={(_, data) => setField('category', data.value)}>
                      {[...new Set([...categories.map(category => category.name), draft.category])].filter(Boolean).map(value => <option key={value}>{value}</option>)}
                    </Select>
                  </Field>
                  <Field label="Цена, рубли" required>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={String(draft.price_kopecks / 100)}
                      onChange={(_, data) => setField('price_kopecks', Math.round((Number(data.value) || 0) * 100))}
                    />
                  </Field>
                  <Field label="Цвет">
                    <Input list={`${formId}-colors`} value={draft.color} onChange={(_, data) => setField('color', data.value)} />
                    <datalist id={`${formId}-colors`}>{['Белый', 'Чёрный', 'Бежевый', 'Зелёный', 'Оливковый', 'Серый', 'Синий', 'Коричневый'].map(value => <option key={value} value={value} />)}</datalist>
                  </Field>
                  <Field label="Материал">
                    <Input list={`${formId}-materials`} value={draft.material} onChange={(_, data) => setField('material', data.value)} />
                    <datalist id={`${formId}-materials`}>{['Хлопок', 'Лён', 'Шерсть', 'Вискоза', 'Хлопок и лён', 'Смесовая ткань'].map(value => <option key={value} value={value} />)}</datalist>
                  </Field>
                  <Field label="Фон карточки" hint="Цвет под фотографией в каталоге">
                    <Select value={draft.tone} onChange={(_, data) => setField('tone', data.value)}>
                      <option value="sand">Песочный</option><option value="olive">Оливковый</option><option value="noir">Тёмный</option><option value="milk">Молочный</option>
                      {!['sand', 'olive', 'noir', 'milk'].includes(draft.tone) && <option value={draft.tone}>Текущий фон</option>}
                    </Select>
                  </Field>
                </div>
                <Field label="Описание">
                  <Textarea resize="vertical" value={draft.description} onChange={(_, data) => setField('description', data.value)} />
                </Field>
                <div className="switch-row">
                  <Switch checked={draft.is_active} onChange={(_, data) => setField('is_active', data.checked)} label="Показывать в магазине" />
                  <Switch checked={draft.is_new} onChange={(_, data) => setField('is_new', data.checked)} label="Новинка" />
                </div>
              </section>

              <section className="form-section">
                <div className="section-heading-row">
                  <div>
                    <Text block weight="semibold" size={400}>Размеры и остатки</Text>
                    <Text className="muted-copy" size={200}>Не удаляйте проданные варианты. Отключайте их переключателем.</Text>
                  </div>
                  <Button
                    type="button"
                    appearance="secondary"
                    icon={<AddRegular />}
                    onClick={() => setField('variants', [...draft.variants, emptyVariant(draft.variants.length)])}
                  >
                    Добавить размер
                  </Button>
                </div>
                <div className="variant-list">
                  {draft.variants.map((variant, index) => (
                    <div className="variant-row" key={variant.id ?? `new-${index}`}>
                      <Field label="Размер" required>
                        <Input required maxLength={16} list={`${formId}-sizes`} value={variant.size} onChange={(_, data) => updateVariant(index, { size: data.value.toUpperCase() })} />
                      </Field>
                      <Field label="Артикул" hint="Можно оставить пустым: создадим автоматически">
                        <Input maxLength={80} value={variant.sku} onChange={(_, data) => updateVariant(index, { sku: data.value })} onBlur={() => updateVariant(index, { sku: productArticle(variant.sku) })} />
                      </Field>
                      <Field label="Количество, шт." required>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          max={1000000}
                          value={String(variant.stock_quantity)}
                          onChange={(_, data) => updateVariant(index, { stock_quantity: Number(data.value) || 0 })}
                        />
                      </Field>
                      <Checkbox
                        checked={variant.is_active}
                        onChange={(_, data) => updateVariant(index, { is_active: data.checked === true })}
                        label="Активен"
                      />
                      {!variant.id && draft.variants.length > 1 && (
                        <Button type="button" appearance="subtle" icon={<DeleteRegular />} onClick={() => removeVariant(index)}>
                          Удалить
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <datalist id={`${formId}-sizes`}>{['XS', 'S', 'M', 'L', 'XL', 'XXL', '48', '50', '52', '54', '56', '58', '60', 'Единый'].map(value => <option key={value} value={value} />)}</datalist>
              </section>

              <section className="form-section">
                <div className="section-heading-row">
                  <div>
                    <Text block weight="semibold" size={400}>Изображения</Text>
                    <Text className="muted-copy" size={200}>JPEG, PNG или WebP до 12 МБ. Первая фотография будет основной.</Text>
                  </div>
                  <label className={`file-button ${uploading ? 'file-button-disabled' : ''}`}>
                    <ImageAddRegular />
                    {uploading ? 'Загрузка' : 'Загрузить'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading || saving || draft.images.length >= 12}
                      onChange={event => uploadImage(event.target.files?.[0])}
                    />
                  </label>
                </div>
                {draft.images.length === 0 ? (
                  <div className="compact-empty">Изображения пока не добавлены.</div>
                ) : (
                  <div className="image-list">
                    {draft.images.map((image, index) => {
                      const previewUrl = previewUrls[image.object_key]
                      return (
                        <div className="image-row" key={image.id ?? image.object_key}>
                          {previewUrl ? <img src={previewUrl} alt="" /> : <div className="image-placeholder"><ImageAddRegular /></div>}
                          <Field label="Описание фотографии" hint="Например: белая мужская джубба, вид спереди">
                            <Input
                              value={image.alt_text}
                              onChange={(_, data) => setField('images', draft.images.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, alt_text: data.value } : item,
                              ))}
                            />
                          </Field>
                          <Button
                            type="button"
                            appearance="subtle"
                            icon={<DeleteRegular />}
                            onClick={() => setField('images', draft.images.filter((_, itemIndex) => itemIndex !== index))}
                          >
                            Убрать
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </form>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose} disabled={saving || uploading}>Отмена</Button>
            <Button appearance="primary" type="submit" form={formId} disabled={saving || uploading}>
              {saving ? 'Сохраняем' : 'Сохранить'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
