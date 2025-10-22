export type Category = {
  id: string
  name: string
  description?: string
}

export type PurchaseLot = {
  importDate: string; // ISO 8601 date string
  quantity: number;
  cost: number;
  unit: string; // e.g., 'cái', 'kg', 'hộp'
}

export type Product = {
  id: string
  name: string
  categoryId: string
  purchaseLots: PurchaseLot[]
  status: 'active' | 'draft' | 'archived'
}

export type Customer = {
  id: string
  name: string
  email: string
  creditLimit: number
  isAgent?: boolean
}

export type SaleItem = {
  productId: string
  quantity: number
  price: number
}

export type Sale = {
  id:string
  customerId: string
  date: string
  items: SaleItem[]
  total: number
}

export type Payment = {
  id: string
  customerId: string
  date: string
  amount: number
}

export type AppUser = {
  id?: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'accountant' | 'inventory_manager';
}

export type ThemeSettings = {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  accent: string;
  accentForeground: string;
}
