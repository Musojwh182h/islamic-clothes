import { Check, ChevronLeft, LockKeyhole, X } from 'lucide-react'
import type { FormEvent } from 'react'
import type { CartItem } from '../types/product'

type Props = {
  items: CartItem[]
  isOpen: boolean
  orderNumber: string | null
  onBack: () => void
  onClose: () => void
  onSubmit: () => void
}

const money = new Intl.NumberFormat('ru-RU')

export function CheckoutDialog({ items, isOpen, orderNumber, onBack, onClose, onSubmit }: Props) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
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
            <p className="eyebrow">ДЕМО-ЗАКАЗ № {orderNumber}</p>
            <h2 id="checkout-title">Заказ оформлен.</h2>
            <p>Это тестовое оформление: деньги не списывались. После подключения orders-service и платёжного провайдера заказ будет сохраняться и оплачиваться по-настоящему.</p>
            <button className="primary-button" type="button" onClick={onClose}>Вернуться в магазин</button>
          </div>
        ) : (
          <div className="checkout-layout">
            <form className="checkout-form" onSubmit={submit}>
              <div className="checkout-title-block"><p className="eyebrow">ОФОРМЛЕНИЕ</p><h2 id="checkout-title">Куда доставить?</h2><p>Заполните данные получателя. Поля со звёздочкой обязательны.</p></div>
              <div className="form-grid">
                <label><span>Имя и фамилия *</span><input name="name" autoComplete="name" required minLength={2} placeholder="Ахмад Ахмадов" /></label>
                <label><span>Телефон *</span><input name="phone" type="tel" autoComplete="tel" required pattern="[+0-9 ()-]{10,20}" placeholder="+7 999 000-00-00" /></label>
                <label><span>Город *</span><input name="city" autoComplete="address-level2" required minLength={2} placeholder="Москва" /></label>
                <label><span>Адрес *</span><input name="address" autoComplete="street-address" required minLength={5} placeholder="Улица, дом, квартира" /></label>
              </div>
              <fieldset className="delivery-choice"><legend>Способ доставки</legend><label><input type="radio" name="delivery" value="courier" defaultChecked /><span><strong>Курьерская доставка</strong><small>Стоимость уточним после подключения службы доставки</small></span></label></fieldset>
              <fieldset className="delivery-choice"><legend>Оплата</legend><label><input type="radio" name="payment" value="demo" defaultChecked /><span><strong>Тестовое оформление</strong><small>Без списания денежных средств</small></span></label></fieldset>
              <label className="consent"><input type="checkbox" required /><span>Согласен на обработку данных для оформления заказа</span></label>
              <button className="primary-button place-order" type="submit">Оформить демо-заказ <LockKeyhole size={15} /></button>
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
