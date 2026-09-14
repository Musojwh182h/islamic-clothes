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
  Text,
  Textarea,
} from '@fluentui/react-components'
import { AddRegular, DeleteRegular, ImageAddRegular } from '@fluentui/react-icons'

import { AdminApi, ApiError } from '../services/api'
import type { AdminProduct, ProductPayload, ProductVariant } from '../types'

type ProductDialogProps = {
  api: AdminApi
  open: boolean
  product: AdminProduct | null
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

function initialPayload(product: AdminProduct | null): ProductPayload {
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
    category: 'Кандуры',
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

export function ProductDialog({ api, open, product, onClose, onSaved }: ProductDialogProps) {
  const formId = useId()
  const [draft, setDraft] = useState<ProductPayload>(() => initialPayload(product))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (open) {
      setDraft(initialPayload(product))
      setError('')
    }
  }, [open, product])

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
    if (draft.variants.length === 0) {
      setError('Добавьте хотя бы один размер')
      return
    }
    setSaving(true)
    try {
      const normalized: ProductPayload = {
        ...draft,
        price_kopecks: Math.round(draft.price_kopecks),
        variants: draft.variants.map((variant, index) => ({
          ...variant,
          sku: variant.sku.trim().toUpperCase(),
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
    <Dialog open={open} onOpenChange={(_, data) => { if (!data.open && !saving) onClose() }}>
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
                    <Input value={draft.name} onChange={(_, data) => setField('name', data.value)} />
                  </Field>
                  <Field label="Slug" required hint="Латиница, цифры и дефисы">
                    <Input value={draft.slug} onChange={(_, data) => setField('slug', data.value.toLowerCase())} />
                  </Field>
                  <Field label="Категория" required>
                    <Input value={draft.category} onChange={(_, data) => setField('category', data.value)} />
                  </Field>
                  <Field label="Цена, рубли" required>
                    <Input
                      type="number"
                      min={0}
                      value={String(draft.price_kopecks / 100)}
                      onChange={(_, data) => setField('price_kopecks', Math.round((Number(data.value) || 0) * 100))}
                    />
                  </Field>
                  <Field label="Цвет">
                    <Input value={draft.color} onChange={(_, data) => setField('color', data.value)} />
                  </Field>
                  <Field label="Материал">
                    <Input value={draft.material} onChange={(_, data) => setField('material', data.value)} />
                  </Field>
                  <Field label="Цветовой код карточки" hint="Например: sand, olive, noir">
                    <Input value={draft.tone} onChange={(_, data) => setField('tone', data.value)} />
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
                        <Input value={variant.size} onChange={(_, data) => updateVariant(index, { size: data.value })} />
                      </Field>
                      <Field label="SKU" required>
                        <Input value={variant.sku} onChange={(_, data) => updateVariant(index, { sku: data.value })} />
                      </Field>
                      <Field label="Остаток" required>
                        <Input
                          type="number"
                          min={0}
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
              </section>

              <section className="form-section">
                <div className="section-heading-row">
                  <div>
                    <Text block weight="semibold" size={400}>Изображения</Text>
                    <Text className="muted-copy" size={200}>JPEG, PNG или WebP до 12 МБ. Файл будет сохранён в MinIO.</Text>
                  </div>
                  <label className={`file-button ${uploading ? 'file-button-disabled' : ''}`}>
                    <ImageAddRegular />
                    {uploading ? 'Загрузка' : 'Загрузить'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading}
                      onChange={event => uploadImage(event.target.files?.[0])}
                    />
                  </label>
                </div>
                {draft.images.length === 0 ? (
                  <div className="compact-empty">Изображения пока не добавлены.</div>
                ) : (
                  <div className="image-list">
                    {draft.images.map((image, index) => {
                      const existing = product?.images.find(item => item.id === image.id)
                      return (
                        <div className="image-row" key={image.id ?? image.object_key}>
                          {existing ? <img src={existing.url} alt="" /> : <div className="image-placeholder"><ImageAddRegular /></div>}
                          <Field label="Альтернативный текст">
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
            <Button appearance="secondary" onClick={onClose} disabled={saving}>Отмена</Button>
            <Button appearance="primary" type="submit" form={formId} disabled={saving || uploading}>
              {saving ? 'Сохраняем' : 'Сохранить'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
