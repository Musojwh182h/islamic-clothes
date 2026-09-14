import { ShoppingBag } from 'lucide-react'
import type { Product } from '../types/product'

type Props = { product: Product; onAdd: (product: Product, size: string) => void }
const money = new Intl.NumberFormat('ru-RU')

export function ProductCard({ product, onAdd }: Props) {
  return <article className={`product-card ${product.tone}`}>
    <div className="product-image"><img src={product.image} alt={product.name} />{product.isNew && <span className="new-badge">новинка</span>}</div>
    <div className="product-copy"><div><p>{product.category}</p><h3>{product.name}</h3></div><strong>{money.format(product.price)} ₽</strong></div>
    <div className="product-actions"><div className="size-row" aria-label={`Выберите размер для ${product.name}`}>{product.sizes.map(size => <button key={size} onClick={() => onAdd(product, size)}>{size}</button>)}</div><button className="add-button" onClick={() => onAdd(product, product.sizes[0])}><ShoppingBag size={17} /> В корзину</button></div>
  </article>
}
