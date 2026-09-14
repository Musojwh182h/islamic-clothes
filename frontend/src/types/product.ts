export type Product = {
  id: number
  slug: string
  name: string
  category: string
  price: number
  sizes: string[]
  image: string
  tone: string
  isNew?: boolean
}

export type CartItem = Product & { size: string; quantity: number }
