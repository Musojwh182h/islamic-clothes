import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ChevronDown, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { CartDrawer } from './components/CartDrawer'
import { CheckoutDialog } from './components/CheckoutDialog'
import { AuthDialog } from './components/AuthDialog'
import { Logo } from './components/Logo'
import { ProductCard } from './components/ProductCard'
import type { CartItem, Product } from './types/product'
import { refreshAuthSession, type AuthUser } from './services/auth'
import { fetchProducts } from './services/catalog'
import { createOrder, OrderError, type DeliveryDetails } from './services/orders'

const CART_STORAGE_KEY = 'sabr-cart-v1'

type StoredCartItem = { id: string; size: string; quantity: number }

function loadCart(products: Product[]): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY)
    if (!saved) return []

    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((stored: StoredCartItem) => {
      if (!stored || typeof stored !== 'object') return []
      const product = products.find(item => item.id === stored.id)
      const isValid = product
        && product.sizes.includes(stored.size)
        && Number.isInteger(stored.quantity)
        && stored.quantity > 0 && stored.quantity <= 100

      return isValid ? [{ ...product, size: stored.size, quantity: stored.quantity }] : []
    })
  } catch {
    return []
  }
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState('Все')
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([])
  const [catalogReady, setCatalogReady] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCartOpen, setCartOpen] = useState(false)
  const [isCheckoutOpen, setCheckoutOpen] = useState(false)
  const [isAuthOpen, setAuthOpen] = useState(false)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [checkoutAfterLogin, setCheckoutAfterLogin] = useState(false)
  const [orderBusy, setOrderBusy] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [orderTotal, setOrderTotal] = useState<number | null>(null)
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID())
  const [isMenuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const shownProducts = useMemo(
    () => activeCategory === 'Все' ? catalogProducts : catalogProducts.filter(product => product.category === activeCategory),
    [activeCategory, catalogProducts],
  )
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0)
  const categories = ['Все', ...new Set(catalogProducts.map(product => product.category))]

  useEffect(() => {
    if (!catalogReady) return
    const storedItems: StoredCartItem[] = cartItems.map(({ id, size, quantity }) => ({ id, size, quantity }))
    if (storedItems.length === 0) {
      localStorage.removeItem(CART_STORAGE_KEY)
    } else {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(storedItems))
    }
  }, [cartItems, catalogReady])

  useEffect(() => {
    refreshAuthSession().then(result => setAuthUser(result.user)).catch(() => undefined)
    fetchProducts().then(result => {
      setCatalogProducts(result)
      setCartItems(loadCart(result))
      setCatalogReady(true)
    }).catch(() => setCatalogError('Не удалось загрузить каталог. Обновите страницу чуть позже.'))
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

  function changeQuantity(id: string, size: string, delta: number) {
    setCartItems(current => current.flatMap(item => {
      if (item.id !== id || item.size !== size) return [item]
      const quantity = item.quantity + delta
      return quantity > 0 ? [{ ...item, quantity }] : []
    }))
  }

  function removeItem(id: string, size: string) {
    setCartItems(current => current.filter(item => item.id !== id || item.size !== size))
  }

  function openCheckout() {
    if (!cartItems.length) return
    setCartOpen(false)
    setOrderNumber(null)
    setOrderError('')
    if (!authUser) {
      setCheckoutAfterLogin(true)
      setAuthOpen(true)
      return
    }
    setCheckoutOpen(true)
  }

  async function placeOrder(details: DeliveryDetails) {
    if (orderBusy) return
    if (!authUser) {
      setCheckoutOpen(false)
      setCheckoutAfterLogin(true)
      setAuthOpen(true)
      return
    }
    setOrderBusy(true)
    setOrderError('')
    try {
      const order = await createOrder(cartItems, details, requestKey)
      setOrderNumber(order.number)
      setOrderTotal(order.total_kopecks / 100)
      setCartItems([])
      setRequestKey(crypto.randomUUID())
    } catch (reason) {
      if (reason instanceof OrderError && reason.status === 401) {
        setAuthUser(null)
        setCheckoutOpen(false)
        setCheckoutAfterLogin(true)
        setAuthOpen(true)
      } else {
        setOrderError(reason instanceof Error ? reason.message : 'Не удалось отправить заказ. Попробуйте снова')
      }
    } finally { setOrderBusy(false) }
  }

  return (
    <main id="top">
      <div className="announcement">Доставка по России <span>•</span> бережно упакуем каждый заказ</div>
      <header className="site-header">
        <Logo />
        <nav className="desktop-nav" aria-label="Основная навигация">
          <a href="#catalog">Каталог</a><a href="#delivery">Доставка</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button search-button" aria-label="Поиск"><Search size={20} /></button>
          <button className={`account-button ${authUser ? 'is-authenticated' : ''}`} onClick={() => setAuthOpen(true)} aria-label={authUser ? `Личный кабинет ${authUser.phone}` : 'Войти'}><UserRound size={20} /><span>{authUser ? authUser.phone : 'Войти'}</span></button>
          <button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Корзина, товаров: ${itemCount}`}><ShoppingBag size={20} /><span>{itemCount}</span></button>
          <button className="icon-button menu-button" onClick={() => setMenuOpen(!isMenuOpen)} aria-label="Открыть меню">{isMenuOpen ? <X /> : <Menu />}</button>
        </div>
        {isMenuOpen && <nav className="mobile-nav"><a href="#catalog" onClick={() => setMenuOpen(false)}>Каталог</a><a href="#delivery" onClick={() => setMenuOpen(false)}>Доставка</a><button onClick={() => setCartOpen(true)}>Корзина ({itemCount})</button></nav>}
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
        {catalogError && <p role="alert">{catalogError}</p>}
        {!catalogReady && !catalogError && <p role="status">Загружаем каталог…</p>}
        {catalogReady && shownProducts.length === 0 && <p>В этой категории пока нет товаров.</p>}
        <div className="product-grid">{shownProducts.map(product => <ProductCard key={product.id} product={product} onAdd={addToCart} />)}</div>
      </section>

      <section id="delivery" className="benefits section-shell"><div><span>01</span><h3>По России</h3><p>Стоимость и сроки доставки согласуем при подтверждении заказа.</p></div><div><span>02</span><h3>Без суеты</h3><p>Поможем уточнить размер и состав заказа перед отправкой.</p></div><div><span>03</span><h3>Всё в рублях</h3><p>Оплата после подтверждения заказа. Способ согласуем с вами.</p></div></section>

      <footer className="site-footer"><Logo /><p>Мужская исламская одежда с достоинством.</p><div><a href="#top">Telegram</a><a href="#top">Instagram</a><span>© 2026 SABR</span></div></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
      <CartDrawer items={cartItems} isOpen={isCartOpen} onClose={() => setCartOpen(false)} onChangeQuantity={changeQuantity} onRemove={removeItem} onCheckout={openCheckout} />
      <CheckoutDialog items={cartItems} isOpen={isCheckoutOpen} orderNumber={orderNumber} busy={orderBusy} error={orderError} totalSaved={orderTotal} phone={authUser?.phone ?? ''} onBack={() => { if (!orderBusy) { setCheckoutOpen(false); setCartOpen(true) } }} onClose={() => { if (!orderBusy) setCheckoutOpen(false) }} onSubmit={placeOrder} />
      <AuthDialog isOpen={isAuthOpen} user={authUser} onClose={() => { setAuthOpen(false); setCheckoutAfterLogin(false) }} onAuthenticated={user => { setAuthUser(user); setAuthOpen(false); if (checkoutAfterLogin) { setCheckoutAfterLogin(false); setCheckoutOpen(true) } }} onLoggedOut={() => { setAuthUser(null); setCartItems([]); setCheckoutOpen(false); setAuthOpen(false) }} />
    </main>
  )
}
