import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ChevronDown, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { CartDrawer } from './components/CartDrawer'
import { CheckoutDialog } from './components/CheckoutDialog'
import { AuthDialog } from './components/AuthDialog'
import { Logo } from './components/Logo'
import { ProductCard } from './components/ProductCard'
import { products } from './data/products'
import type { CartItem, Product } from './types/product'
import { refreshAuthSession, type AuthUser } from './services/auth'

const categories = ['Все', 'Кандуры', 'Джуббы', 'Тобы']
const CART_STORAGE_KEY = 'sabr-cart-v1'

type StoredCartItem = { id: number; size: string; quantity: number }

function loadCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY)
    if (!saved) return []

    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((stored: StoredCartItem) => {
      const product = products.find(item => item.id === stored.id)
      const isValid = product
        && product.sizes.includes(stored.size)
        && Number.isInteger(stored.quantity)
        && stored.quantity > 0

      return isValid ? [{ ...product, size: stored.size, quantity: stored.quantity }] : []
    })
  } catch {
    return []
  }
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState('Все')
  const [cartItems, setCartItems] = useState<CartItem[]>(loadCart)
  const [isCartOpen, setCartOpen] = useState(false)
  const [isCheckoutOpen, setCheckoutOpen] = useState(false)
  const [isAuthOpen, setAuthOpen] = useState(false)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [isMenuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const shownProducts = useMemo(
    () => activeCategory === 'Все' ? products : products.filter(product => product.category === activeCategory),
    [activeCategory],
  )
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0)

  useEffect(() => {
    const storedItems: StoredCartItem[] = cartItems.map(({ id, size, quantity }) => ({ id, size, quantity }))
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(storedItems))
  }, [cartItems])

  useEffect(() => {
    refreshAuthSession().then(result => setAuthUser(result.user)).catch(() => undefined)
  }, [])

  function addToCart(product: Product, size: string) {
    setCartItems(current => {
      const found = current.find(item => item.id === product.id && item.size === size)
      return found
        ? current.map(item => item === found ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { ...product, size, quantity: 1 }]
    })
    setNotice(`${product.name}, размер ${size} — добавлено`)
    window.setTimeout(() => setNotice(''), 2600)
  }

  function changeQuantity(id: number, size: string, delta: number) {
    setCartItems(current => current.flatMap(item => {
      if (item.id !== id || item.size !== size) return [item]
      const quantity = item.quantity + delta
      return quantity > 0 ? [{ ...item, quantity }] : []
    }))
  }

  function removeItem(id: number, size: string) {
    setCartItems(current => current.filter(item => item.id !== id || item.size !== size))
  }

  function openCheckout() {
    setCartOpen(false)
    setOrderNumber(null)
    setCheckoutOpen(true)
  }

  function placeOrder() {
    setOrderNumber(String(Date.now()).slice(-6))
    setCartItems([])
  }

  return (
    <main id="top">
      <div className="announcement">Бесплатная доставка от 10 000 ₽ <span>•</span> бережно упакуем каждый заказ</div>
      <header className="site-header">
        <Logo />
        <nav className="desktop-nav" aria-label="Основная навигация">
          <a href="#catalog">Каталог</a><a href="#philosophy">О нас</a><a href="#delivery">Доставка</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button search-button" aria-label="Поиск"><Search size={20} /></button>
          <button className={`account-button ${authUser ? 'is-authenticated' : ''}`} onClick={() => setAuthOpen(true)} aria-label={authUser ? `Личный кабинет ${authUser.phone}` : 'Войти'}><UserRound size={20} /><span>{authUser ? authUser.phone : 'Войти'}</span></button>
          <button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Корзина, товаров: ${itemCount}`}><ShoppingBag size={20} /><span>{itemCount}</span></button>
          <button className="icon-button menu-button" onClick={() => setMenuOpen(!isMenuOpen)} aria-label="Открыть меню">{isMenuOpen ? <X /> : <Menu />}</button>
        </div>
        {isMenuOpen && <nav className="mobile-nav"><a href="#catalog" onClick={() => setMenuOpen(false)}>Каталог</a><a href="#philosophy" onClick={() => setMenuOpen(false)}>О нас</a><a href="#delivery" onClick={() => setMenuOpen(false)}>Доставка</a><button onClick={() => setCartOpen(true)}>Корзина ({itemCount})</button></nav>}
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-art" role="img" aria-label="Мужчина в светлой традиционной одежде" />
        <div className="hero-overlay" />
        <div className="hero-content"><p className="eyebrow light">КОЛЛЕКЦИЯ ОСЕНЬ / ЗИМА 2026</p><h1 id="hero-title">Тишина в<br /><em>каждой</em> линии.</h1><p className="hero-description">Одежда, в которой достоинство чувствуется без лишних слов.</p><a className="primary-button light-button" href="#catalog">Смотреть коллекцию <ArrowDownRight size={18} /></a></div>
        <div className="hero-caption"><span>01 — 04</span><span>Создано для пути</span></div>
      </section>

      <section className="intro-strip"><p>Осознанный гардероб для <span>настоящего мужчины.</span></p><div>Натуральные ткани <i /> Свободный крой <i /> Сделано с уважением</div></section>

      <section id="catalog" className="catalog section-shell" aria-labelledby="catalog-title">
        <div className="section-heading"><div><p className="eyebrow">ВИТРИНА</p><h2 id="catalog-title">Выберите своё.</h2></div><p>Лаконичные силуэты, которые легко становятся частью повседневной жизни.</p></div>
        <div className="catalog-tools"><div className="filters" aria-label="Категории">{categories.map(category => <button key={category} className={category === activeCategory ? 'active' : ''} onClick={() => setActiveCategory(category)}>{category}</button>)}</div><button className="sort-button">По популярности <ChevronDown size={16} /></button></div>
        <div className="product-grid">{shownProducts.map(product => <ProductCard key={product.id} product={product} onAdd={addToCart} />)}</div>
      </section>

      <section id="philosophy" className="philosophy">
        <div className="philosophy-image" role="img" aria-label="Деталь натуральной ткани" />
        <div className="philosophy-copy"><p className="eyebrow">НАШ ПОДХОД</p><h2>Вещи — не для впечатления. <em>Для смысла.</em></h2><p>Мы ищем правильный баланс: чистые формы, достойная посадка и ткани, к которым хочется возвращаться. Никакого шума — только то, что остаётся важным.</p><a href="#catalog" className="text-link">Узнать о материалах <ArrowDownRight size={17} /></a></div>
      </section>

      <section id="delivery" className="benefits section-shell"><div><span>01</span><h3>По России</h3><p>Отправляем заказы в любой регион. Бесплатно — от 10 000 ₽.</p></div><div><span>02</span><h3>Без суеты</h3><p>Можно обменять размер в течение 14 дней после получения.</p></div><div><span>03</span><h3>Всё в рублях</h3><p>Честная цена без скрытых комиссий. Оплата картой на сайте.</p></div></section>

      <footer className="site-footer"><Logo /><p>Мужская исламская одежда с достоинством.</p><div><a href="#top">Telegram</a><a href="#top">Instagram</a><span>© 2026 SABR</span></div></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
      <CartDrawer items={cartItems} isOpen={isCartOpen} onClose={() => setCartOpen(false)} onChangeQuantity={changeQuantity} onRemove={removeItem} onCheckout={openCheckout} />
      <CheckoutDialog items={cartItems} isOpen={isCheckoutOpen} orderNumber={orderNumber} onBack={() => { setCheckoutOpen(false); setCartOpen(true) }} onClose={() => setCheckoutOpen(false)} onSubmit={placeOrder} />
      <AuthDialog isOpen={isAuthOpen} user={authUser} onClose={() => setAuthOpen(false)} onAuthenticated={user => { setAuthUser(user); setAuthOpen(false) }} onLoggedOut={() => { setAuthUser(null); setAuthOpen(false) }} />
    </main>
  )
}
