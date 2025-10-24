export type Category = {
  id: string
  name: string
  description?: string
}

export type Unit = {
  id: string
  name: string
  description?: string
  baseUnitId?: string;
  conversionFactor?: number;
}

export type PurchaseLot = {
  importDate: string; // ISO 8601 date string
  quantity: number;
  cost: number;
  unitId: string;
}

export type Product = {
  id: string
  name: string
  categoryId: string
  unitId: string;
  purchaseLots: PurchaseLot[]
  status: 'active' | 'draft' | 'archived'
  lowStockThreshold?: number;
}

export type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  customerType: 'personal' | 'business';
  customerGroup?: string;
  gender?: 'male' | 'female' | 'other';
  birthday?: string; // ISO 8601 date string
  zalo?: string;
  creditLimit: number;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
  status: 'active' | 'inactive';
}

export type SalesItem = {
  id: string;
  salesTransactionId: string;
  productId: string
  quantity: number
  price: number
}

export type Sale = {
  id: string;
  customerId: string;
  transactionDate: string; // ISO 8601 date string
  totalAmount: number; // Gross total before discount
  finalAmount: number; // Net total after discount
  discount?: number;
  discountType?: 'percentage' | 'amount';
  discountValue?: number;
  customerPayment?: number;
  previousDebt?: number;
  remainingDebt?: number;
}

export type Payment = {
  id: string
  customerId: string
  paymentDate: string
  amount: number
  notes?: string
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
  lowStockThreshold: number;
}
