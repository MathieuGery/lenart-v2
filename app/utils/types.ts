// Collections
export interface CollectionListItem {
  id: string
  name: string
  description: string | null
  visible: boolean
  createdAt: string
  photoCount: number
}

export interface PublicCollectionListItem extends CollectionListItem {
  coverUrl: string | null
}

export interface Photo {
  id: string
  collectionId: string
  key: string
  filename: string
  hash: string
  size: number
  createdAt: string
  url: string
}

export interface CollectionDetail {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  photos: Photo[]
}

// Contact
export interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: string
  createdAt: string
}

// Dashboard stats
export interface DashboardStats {
  revenue: { paidCents: number, cashPaidCents: number, cashPendingCents: number }
  orders: { total: number, paid: number, pending: number, cashPending: number, cancelled: number, other: number }
  photos: { total: number, sold: number, unlinked: number }
  collections: number
  messages: { unread: number }
  recentOrders: {
    id: string
    firstName: string
    lastName: string
    status: string
    cashPayment: boolean
    totalCents: number
    createdAt: string
    photoCount: number
  }[]
  formulas: {
    name: string
    count: number
  }[]
}

// Terminals
export interface Terminal {
  id: string
  description: string | null
  brand: string | null
  model: string | null
  serialNumber: string | null
  currency: string | null
}

// Public order (for success page)
export interface PublicOrderDetail {
  id: string
  status: string
  cashPayment: boolean
  email: string
  firstName: string
  lastName: string
  totalCents: number
  photoCount: number
  photos: { id: string, filename: string, url: string }[]
  createdAt: string
}

// Orders
export interface OrderPhoto {
  itemId: string
  id: string | null
  filename: string | null
  linked: boolean
  collectionId: string | null
  collectionName: string | null
  url: string | null
}

export interface OrderPrintPhoto {
  id: string | null
  filename: string | null
  linked: boolean
  url: string | null
}

export interface OrderDetail {
  id: string
  email: string
  firstName: string
  lastName: string
  address: string | null
  city: string | null
  postalCode: string | null
  country: string | null
  amazonLink: string | null
  promoCode: string | null
  discountCents: number
  status: string
  businessStatus: string
  photosEmailSentAt: string | null
  cashPayment: boolean
  createdByAdmin: boolean | null
  totalCents: number
  formulaName: string | null
  molliePaymentId: string | null
  createdAt: string
  updatedAt: string
  photos: OrderPhoto[]
  printPhoto: OrderPrintPhoto | null
}

export interface OrderListItem {
  id: string
  email: string
  firstName: string
  lastName: string
  status: string
  businessStatus: string
  cashPayment: boolean
  createdByAdmin: boolean | null
  totalCents: number
  createdAt: string
  photoCount: number
}

export interface PromoCode {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  maxUsage: number
  usageCount: number
  isActive: boolean
  formulaId: string | null
  formulaName: string | null
  createdAt: string
  updatedAt: string
}

// Galleries
export interface Gallery {
  id: string
  title: string
  code: string
  link: string
  date: string | null
  createdAt: string
}

export interface PublicGalleryItem {
  title: string
  link: string
  date: string | null
}

export interface OrderComment {
  id: string
  orderId: string
  content: string
  createdAt: string
}

export interface PricingFormula {
  id: string
  name: string
  basePriceCents: number
  digitalPhotosCount: number
  extraPhotoPriceCents: number | null
  isTourComplete: boolean
  printDetails: string | null
}

// Customers
export interface CustomerListItem {
  email: string
  firstName: string
  lastName: string
  orderCount: number
  paidOrderCount: number
  totalSpentCents: number
  lastOrderAt: string
  firstOrderAt: string
}

export interface CustomerDetail {
  email: string
  firstName: string
  lastName: string
  address: string | null
  city: string | null
  postalCode: string | null
  country: string | null
  orderCount: number
  paidOrderCount: number
  totalSpentCents: number
  totalPhotoCount: number
  firstOrderAt: string
  lastOrderAt: string
  orders: {
    id: string
    firstName: string
    lastName: string
    email: string
    status: string
    businessStatus: string
    cashPayment: boolean
    createdByAdmin: boolean | null
    totalCents: number
    formulaName: string | null
    address: string | null
    city: string | null
    postalCode: string | null
    country: string | null
    createdAt: string
    photoCount: number
  }[]
}
