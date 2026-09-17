export type AdminUser = {
  id: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

export type AuthSession = {
  access_token: string
  token_type: string
  expires_in: number
  user: AdminUser
}

export type ProductVariant = {
  id?: string
  sku: string
  size: string
  stock_quantity: number
  sort_order: number
  is_active: boolean
}

export type ProductImage = {
  id?: string
  object_key: string
  url: string
  alt_text: string
  sort_order: number
}

export type AdminProduct = {
  id: string
  slug: string
  name: string
  description: string
  category: string
  price_kopecks: number
  color: string
  material: string
  tone: string
  is_active: boolean
  is_new: boolean
  variants: ProductVariant[]
  images: ProductImage[]
  created_at: string
  updated_at: string
}

export type ProductPayload = Omit<AdminProduct, 'id' | 'created_at' | 'updated_at' | 'images'> & {
  images: Array<Omit<ProductImage, 'url'>>
  expected_updated_at?: string
}

export type ProductPage = {
  items: AdminProduct[]
  total: number
  offset: number
  limit: number
}

export type ProductCategory = {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export type MediaObject = {
  object_key: string
  url: string
  content_type: string
  size_bytes: number
  width: number
  height: number
  checksum_sha256: string
}

export type OrderStatus = 'new' | 'confirmed' | 'assembling' | 'shipped' | 'delivered' | 'cancelled'

export type AdminOrderItem = {
  id: string
  product_id: string
  variant_id: string
  sku: string
  product_name: string
  size: string
  unit_price_kopecks: number
  quantity: number
  line_total_kopecks: number
}

export type OrderHistory = {
  id: string
  from_status: string | null
  to_status: string
  actor_user_id: string | null
  comment: string
  created_at: string
}

export type AdminPayment = {
  id: string
  provider: string
  provider_payment_id: string | null
  status: string
  amount_kopecks: number
  currency: string
  created_at: string
  updated_at: string
}

export type AdminOrder = {
  id: string
  number: string
  user_id: string
  status: OrderStatus
  payment_status: string
  recipient_name: string
  customer_phone: string
  delivery_method: string
  delivery_address: Record<string, unknown>
  currency: string
  subtotal_kopecks: number
  delivery_kopecks: number
  total_kopecks: number
  items: AdminOrderItem[]
  history: OrderHistory[]
  payments: AdminPayment[]
  created_at: string
  updated_at: string
}

export type OrderPage = {
  items: AdminOrder[]
  total: number
  offset: number
  limit: number
}
