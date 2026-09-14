import type { Product } from '../types/product'

const MEDIA_PUBLIC_BASE_URL = import.meta.env.VITE_MEDIA_PUBLIC_BASE_URL ?? 'http://localhost:9000/sabr-product-media'

export const products: Product[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'kandura-sand',
    name: 'Кандура «Песок»',
    category: 'Кандуры',
    price: 6490,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    image: `${MEDIA_PUBLIC_BASE_URL}/products/kandura-sand.png`,
    tone: 'sand',
    isNew: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    slug: 'jubba-noir',
    name: 'Джубба «Ночь»',
    category: 'Джуббы',
    price: 7890,
    sizes: ['M', 'L', 'XL', 'XXL'],
    image: `${MEDIA_PUBLIC_BASE_URL}/products/jubba-noir.png`,
    tone: 'noir',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    slug: 'thobe-olive',
    name: 'Тоб «Олива»',
    category: 'Тобы',
    price: 7190,
    sizes: ['S', 'M', 'L', 'XL'],
    image: `${MEDIA_PUBLIC_BASE_URL}/products/thobe-olive.png`,
    tone: 'olive',
    isNew: true,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    slug: 'jubba-milk',
    name: 'Джубба «Молоко»',
    category: 'Джуббы',
    price: 7590,
    sizes: ['M', 'L', 'XL', 'XXL'],
    image: `${MEDIA_PUBLIC_BASE_URL}/products/jubba-milk.png`,
    tone: 'milk',
  },
]
