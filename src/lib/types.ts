

export type Permission = 'view' | 'add' | 'edit' | 'delete';

export type Module = 
  | 'dashboard'
  | 'categories'
  | 'units'
  | 'products'
  | 'purchases'
  | 'sales'
  | 'customers'
  | 'reports'
  | 'users'
  | 'settings'
  | 'pos';

export type Permissions = {
  [key in Module]?: Permission[];
};


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
  barcode?: string;
  categoryId: string
  unitId: string;
  sellingPrice?: number;
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
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  creditLimit: number;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
  status: 'active' | 'inactive';
  loyaltyPoints?: number; // Spendable points
  lifetimePoints?: number; // Total earned points for tier calculation
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'diamond';
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
  invoiceNumber: string;
  customerId: string;
  transactionDate: string; // ISO 8601 date string
  status: 'pending' | 'unprinted' | 'printed';
  totalAmount: number; // Gross total before discount and VAT
  vatAmount?: number; // VAT amount
  finalAmount: number; // Net total after discount and VAT
  discount?: number;
  discountType?: 'percentage' | 'amount';
  discountValue?: number;
  pointsUsed?: number; // New field
  pointsDiscount?: number; // New field
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
  role: 'admin' | 'accountant' | 'inventory_manager' | 'custom';
  permissions?: Permissions;
}

export type LoyaltyTierConfig = {
  name: 'bronze' | 'silver' | 'gold' | 'diamond';
  vietnameseName: string;
  threshold: number;
};

export type LoyaltySettings = {
  pointsPerAmount: number; // How much money to spend to get 1 point
  pointsToVndRate: number; // How much 1 point is worth in VND
  tiers: LoyaltyTierConfig[];
}

export type ThemeSettings = {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  accent: string;
  accentForeground: string;
  lowStockThreshold: number;
  vatRate?: number;
  companyName?: string;
  companyBusinessLine?: string;
  companyAddress?: string;
  companyPhone?: string;
  loyalty?: LoyaltySettings;
}

export type PurchaseOrderItem = {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productName?: string;
  quantity: number;
  cost: number;
  unitId: string;
}

export type PurchaseOrder = {
  id: string;
  orderNumber: string;
  importDate: string; // ISO date string
  items: PurchaseOrderItem[];
  totalAmount: number;
  notes?: string;
  createdAt: any; // server timestamp
}
