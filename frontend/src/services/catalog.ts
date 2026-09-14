import type { Product } from '../types/product'

const CATALOG_API_URL = import.meta.env.VITE_CATALOG_API_URL ?? 'http://localhost:8101/api/v1/catalog'

type ApiProduct = {
  id: string
  slug: string
  name: string
  category: string
  price_kopecks: number
  sizes: string[]
  image: string
  tone: string
  is_new: boolean
  variants: Array<{ id: string; sku: string; size: string; stock_quantity: number }>
}

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch(`${CATALOG_API_URL}/products`)
  if (!response.ok) throw new Error(`Catalog API returned ${response.status}`)
  const products = await response.json() as ApiProduct[]
  return products.map(product => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    price: product.price_kopecks / 100,
    sizes: product.sizes,
    image: product.image,
    tone: product.tone,
    isNew: product.is_new,
    variants: product.variants.map(variant => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      stockQuantity: variant.stock_quantity,
    })),
  }))
}
