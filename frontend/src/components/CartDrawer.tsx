import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import type { CartItem } from '../types/product'

type Props = {
  items: CartItem[]
  isOpen: boolean
  onClose: () => void
  onChangeQuantity: (id: number, size: string, delta: number) => void
  onRemove: (id: number, size: string) => void
  onCheckout: () => void
}

const money = new Intl.NumberFormat('ru-RU')

export function CartDrawer({ items, isOpen, onClose, onChangeQuantity, onRemove, onCheckout }: Props) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className={`drawer-layer ${isOpen ? 'is-open' : ''}`} aria-hidden={!isOpen}>
      <button className="drawer-backdrop" onClick={onClose} tabIndex={isOpen ? 0 : -1} aria-label="Закрыть корзину" />
      <aside className="cart-drawer" aria-label="Корзина">
        <header className="drawer-head">
          <div><span className="eyebrow">ВАШ ВЫБОР</span><h2>Корзина</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть корзину"><X size={22} /></button>
        </header>
        {items.length === 0 ? (
          <div className="empty-cart"><ShoppingBag size={32} strokeWidth={1.25} /><p>Пока здесь спокойно.</p><span>Добавьте вещь, которая будет радовать каждый день.</span></div>
        ) : (
          <>
            <div className="cart-lines">
              {items.map((item) => (
                <article className="cart-line" key={`${item.id}-${item.size}`}>
                  <img src={item.image} alt="" />
                  <div className="line-details"><h3>{item.name}</h3><p>Размер {item.size}</p><strong>{money.format(item.price)} ₽</strong>
                    <div className="quantity"><button onClick={() => onChangeQuantity(item.id, item.size, -1)} aria-label="Уменьшить"><Minus size={14} /></button><span>{item.quantity}</span><button onClick={() => onChangeQuantity(item.id, item.size, 1)} aria-label="Увеличить"><Plus size={14} /></button></div>
                  </div>
                  <button className="remove" onClick={() => onRemove(item.id, item.size)} aria-label={`Удалить ${item.name}`}><Trash2 size={17} /></button>
                </article>
              ))}
            </div>
            <footer className="cart-footer"><div className="total"><span>Итого</span><strong>{money.format(total)} ₽</strong></div><button className="primary-button checkout" onClick={onCheckout}>Продолжить оформление</button><p>Доставка и способ оплаты — на следующем шаге.</p></footer>
          </>
        )}
      </aside>
    </div>
  )
}
