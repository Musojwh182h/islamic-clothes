export type Product = {
  id: string
  slug: string
  name: string
  category: string
  price: number
  sizes: string[]
  image: string
  tone: string
  isNew?: boolean
  variants?: Array<{ id: string; sku: string; size: string; stockQuantity: number }>
}

export type CartItem = Product & { size: string; quantity: number }
