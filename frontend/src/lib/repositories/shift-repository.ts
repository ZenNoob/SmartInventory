// Shift repository types - re-exported from actions
export interface Shift {
  id: string;
  storeId: string;
  userId: string;
  userName?: string;
  startTime: string;
  endTime?: string;
  startingCash: number;
  endingCash?: number;
  expectedCash?: number;
  cashDifference?: number;
  status: 'open' | 'closed';
  totalSales?: number;
  totalTransactions?: number;
  totalRevenue?: number;
  cashSales?: number;
  cashPayments?: number;
  totalCashInDrawer?: number;
  salesCount?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown; // Allow indexing
}

export interface ShiftWithSummary extends Shift {
  salesCount: number;
  totalRevenue: number;
  cashPayments: number;
  cardPayments: number;
  otherPayments: number;
  cashSales: number;
}

export interface ShiftSale {
  id: string;
  shiftId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
}
