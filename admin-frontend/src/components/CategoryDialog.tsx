import { useEffect, useId, useState, type FormEvent } from 'react'
import {
  Button,
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
  Text,
} from '@fluentui/react-components'

import { AdminApi, ApiError } from '../services/api'
import type { ProductCategory } from '../types'

type CategoryDialogProps = {
  api: AdminApi
  open: boolean
  onClose: () => void
  onCreated: (category: ProductCategory) => void
}

export function CategoryDialog({ api, open, onClose, onCreated }: CategoryDialogProps) {
  const formId = useId()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setError('')
  }, [open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving || name.trim().length < 2) return
    setSaving(true)
    setError('')
    try {
      onCreated(await api.createCategory(name.trim()))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось добавить категорию')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => { if (!data.open && !saving) onClose() }}>
      <DialogSurface className="category-dialog">
        <DialogBody>
          <DialogTitle>Новая категория</DialogTitle>
          <DialogContent>
            <Text block className="muted-copy">После добавления категория появится в форме товара и в фильтрах магазина.</Text>
            {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
            <form id={formId} onSubmit={submit}>
              <Field label="Название категории" required>
                <Input autoFocus required minLength={2} maxLength={80} value={name} onChange={(_, data) => setName(data.value)} placeholder="Например: Куртки" />
              </Field>
            </form>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose} disabled={saving}>Отмена</Button>
            <Button appearance="primary" type="submit" form={formId} disabled={saving || name.trim().length < 2}>{saving ? 'Добавляем…' : 'Добавить'}</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
