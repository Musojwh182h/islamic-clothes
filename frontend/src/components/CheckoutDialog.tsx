import { Check, ChevronLeft, LockKeyhole, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { CartItem } from '../types/product'
import type { DeliveryDetails } from '../services/orders'

type Props = {
  items: CartItem[]
  isOpen: boolean
  orderNumber: string | null
  onBack: () => void
  onClose: () => void
  onSubmit: (details: DeliveryDetails) => Promise<void>
  busy: boolean
  error: string
  phone: string
  totalSaved: number | null
}

const money = new Intl.NumberFormat('ru-RU')

export function CheckoutDialog({ items, isOpen, orderNumber, onBack, onClose, onSubmit, busy, error, phone, totalSaved }: Props) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const [details, setDetails] = useState({ recipient_name: '', phone: '', city: '', address: '' })
  const [consent, setConsent] = useState(false)

  useEffect(() => {
    if (phone) setDetails(current => current.phone ? current : { ...current, phone })
  }, [phone])

  useEffect(() => {
    if (!orderNumber) return
    setDetails(current => ({ recipient_name: '', phone: current.phone, city: '', address: '' }))
    setConsent(false)
  }, [orderNumber])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit({
      recipient_name: details.recipient_name.trim(),
      phone: details.phone.trim(),
      city: details.city.trim(),
      address: details.address.trim(),
    })
  }

  if (!isOpen) return null

  return (
    <div className="checkout-layer is-open">
      <button className="checkout-backdrop" onClick={onClose} aria-label="Закрыть оформление" />
      <section className="checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <header className="checkout-head">
          {!orderNumber ? <button className="back-button" type="button" onClick={onBack}><ChevronLeft size={17} /> Корзина</button> : <span />}
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть"><X size={22} /></button>
        </header>

        {orderNumber ? (
          <div className="order-success">
            <span className="success-mark"><Check size={29} /></span>
            <p className="eyebrow">ЗАКАЗ № {orderNumber}</p>
            <h2 id="checkout-title">Заказ оформлен.</h2>
            <p>Заказ на сумму {money.format(totalSaved ?? 0)} ₽ передан магазину. Мы свяжемся с вами для подтверждения наличия, стоимости доставки и оплаты. Деньги пока не списывались.</p>
            <button className="primary-button" type="button" onClick={onClose}>Вернуться в магазин</button>
          </div>
        ) : (
          <div className="checkout-layout">
            <form className="checkout-form" onSubmit={submit}>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="checkout-title-block"><p className="eyebrow">ОФОРМЛЕНИЕ</p><h2 id="checkout-title">Куда доставить?</h2><p>Заполните данные получателя. Поля со звёздочкой обязательны.</p></div>
              <div className="form-grid">
                <label><span>Имя и фамилия *</span><input name="name" autoComplete="name" required minLength={2} maxLength={180} value={details.recipient_name} onChange={e => setDetails({ ...details, recipient_name: e.target.value })} placeholder="Ахмад Ахмадов" /></label>
                <label><span>Телефон *</span><input name="phone" type="tel" autoComplete="tel" value={details.phone} onChange={e => setDetails({ ...details, phone: e.target.value })} required minLength={10} maxLength={24} placeholder="+7 999 000-00-00" /></label>
                <label><span>Город *</span><input name="city" autoComplete="address-level2" required minLength={2} maxLength={120} value={details.city} onChange={e => setDetails({ ...details, city: e.target.value })} placeholder="Москва" /></label>
                <label><span>Адрес *</span><input name="address" autoComplete="street-address" required minLength={5} maxLength={500} value={details.address} onChange={e => setDetails({ ...details, address: e.target.value })} placeholder="Улица, дом, квартира" /></label>
              </div>
              <fieldset className="delivery-choice"><legend>Способ доставки</legend><label><input type="radio" name="delivery" value="courier" defaultChecked /><span><strong>Курьерская доставка</strong><small>Стоимость согласуем при подтверждении заказа</small></span></label></fieldset>
              <fieldset className="delivery-choice"><legend>Оплата</legend><span><strong>После подтверждения заказа</strong><small>Менеджер согласует способ оплаты. Сейчас деньги не списываются.</small></span></fieldset>
              <label className="consent"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} /><span>Согласен на обработку данных для оформления заказа</span></label>
              <button className="primary-button place-order" type="submit" disabled={busy || items.length === 0}>{busy ? 'Отправляем заказ…' : 'Оформить заказ'} <LockKeyhole size={15} /></button>
            </form>

            <aside className="order-summary">
              <p className="eyebrow">ВАШ ЗАКАЗ</p>
              <div className="summary-lines">{items.map(item => <div className="summary-line" key={`${item.id}-${item.size}`}><img src={item.image} alt="" /><div><strong>{item.name}</strong><span>Размер {item.size} · {item.quantity} шт.</span></div><b>{money.format(item.price * item.quantity)} ₽</b></div>)}</div>
              <div className="summary-total"><span>Итого</span><strong>{money.format(total)} ₽</strong></div>
            </aside>
          </div>
        )}
      </section>
    </div>
  )
}
