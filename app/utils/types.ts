// Collections
export interface CollectionListItem {
  id: string
  name: string
  description: string | null
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
  revenue: { paidCents: number, cashPendingCents: number }
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
  status: string
  cashPayment: boolean
  totalCents: number
  formulaName: string | null
  molliePaymentId: string | null
  createdAt: string
  updatedAt: string
  photos: OrderPhoto[]
}

export interface OrderListItem {
  id: string
  email: string
  firstName: string
  lastName: string
  status: string
  cashPayment: boolean
  totalCents: number
  createdAt: string
  photoCount: number
}

export interface PricingFormula {
  id: string
  name: string
  basePriceCents: number
  digitalPhotosCount: number
  extraPhotoPriceCents: number | null
  isTourComplete: boolean
}
