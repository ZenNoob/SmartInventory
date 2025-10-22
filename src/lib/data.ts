import type { Product, Category, Customer, Sale, Payment } from '@/lib/types'

export const categories: Category[] = [
  { id: 'cat-1', name: 'Electronics' },
  { id: 'cat-2', name: 'Clothing' },
  { id: 'cat-3', name: 'Groceries' },
  { id: 'cat-4', name: 'Furniture' },
]

export const products: Product[] = [
  { id: 'prod-1', name: 'Laptop Pro', categoryId: 'cat-1', purchaseLots: [], status: 'active' },
  { id: 'prod-2', name: 'Wireless Mouse', categoryId: 'cat-1', purchaseLots: [], status: 'active' },
  { id: 'prod-3', name: 'Men\'s T-Shirt', categoryId: 'cat-2', purchaseLots: [], status: 'active' },
  { id: 'prod-4', name: 'Organic Apples', categoryId: 'cat-3', purchaseLots: [], status: 'active' },
  { id: 'prod-5', name: 'Wooden Desk', categoryId: 'cat-4', purchaseLots: [], status: 'active' },
  { id: 'prod-6', name: '4K Monitor', categoryId: 'cat-1', purchaseLots: [], status: 'active' },
  { id: 'prod-7', name: 'Jeans', categoryId: 'cat-2', purchaseLots: [], status: 'active' },
  { id: 'prod-8', name: 'Milk (1 Gallon)', categoryId: 'cat-3', purchaseLots: [], status: 'active' },
]

export const customers: Customer[] = [
  { id: 'cust-1', name: 'Alice Johnson', email: 'alice@example.com', creditLimit: 5000 },
  { id: 'cust-2', name: 'Bob Williams', email: 'bob@example.com', creditLimit: 2000 },
  { id: 'cust-3', name: 'Charlie Brown', email: 'charlie@example.com', creditLimit: 10000 },
  { id: 'cust-4', name: 'Diana Miller', email: 'diana@example.com', creditLimit: 1500, isAgent: true },
]

export const sales: Sale[] = [
  { id: 'sale-1', customerId: 'cust-1', date: '2023-10-01', items: [{ productId: 'prod-1', quantity: 1, price: 1250 }], total: 1250 },
  { id: 'sale-2', customerId: 'cust-2', date: '2023-10-05', items: [{ productId: 'prod-3', quantity: 5, price: 15 }, { productId: 'prod-7', quantity: 2, price: 50 }], total: 175 },
  { id: 'sale-3', customerId: 'cust-1', date: '2023-10-10', items: [{ productId: 'prod-6', quantity: 1, price: 420 }], total: 420 },
  { id: 'sale-4', customerId: 'cust-4', date: '2023-10-12', items: [{ productId: 'prod-2', quantity: 10, price: 22 }], total: 220 }, // Adjusted price for agent
  { id: 'sale-5', customerId: 'cust-3', date: '2023-11-15', items: [{ productId: 'prod-5', quantity: 2, price: 260 }], total: 520 },
  { id: 'sale-6', customerId: 'cust-2', date: '2023-12-20', items: [{ productId: 'prod-8', quantity: 10, price: 4.5 }], total: 45 },
  { id: 'sale-7', customerId: 'cust-1', date: '2024-01-05', items: [{ productId: 'prod-2', quantity: 2, price: 25 }], total: 50 },
  { id: 'sale-8', customerId: 'cust-2', date: '2024-02-10', items: [{ productId: 'prod-1', quantity: 1, price: 1300 }], total: 1300 },
  { id: 'sale-9', customerId: 'cust-3', date: '2024-03-18', items: [{ productId: 'prod-7', quantity: 3, price: 55 }], total: 165 },
  { id: 'sale-10', customerId: 'cust-4', date: '2024-04-22', items: [{ productId: 'prod-4', quantity: 20, price: 2.8 }], total: 56 },
  { id: 'sale-11', customerId: 'cust-1', date: '2024-05-01', items: [{ productId: 'prod-3', quantity: 10, price: 15 }], total: 150 },
  { id: 'sale-12', customerId: 'cust-2', date: '2024-05-02', items: [{ productId: 'prod-6', quantity: 1, price: 400 }], total: 400 },

]

export const payments: Payment[] = [
  { id: 'pay-1', customerId: 'cust-1', date: '2023-10-15', amount: 1000 },
  { id: 'pay-2', customerId: 'cust-2', date: '2023-10-20', amount: 100 },
  { id: 'pay-3', customerId: 'cust-1', date: '2023-11-01', amount: 670 },
  { id: 'pay-4', customerId: 'cust-4', date: '2023-11-15', amount: 200 },
  { id: 'pay-5', customerId: 'cust-3', date: '2023-12-01', amount: 500 },
  { id: 'pay-6', customerId: 'cust-2', date: '2024-01-15', amount: 75 },
  { id: 'pay-7', customerId: 'cust-2', date: '2024-05-01', amount: 1200 },
]

export const getCustomerDebt = (customerId: string) => {
  const totalSales = sales
    .filter(s => s.customerId === customerId)
    .reduce((acc, sale) => acc + sale.total, 0)
  const totalPayments = payments
    .filter(p => p.customerId === customerId)
    .reduce((acc, payment) => acc + payment.amount, 0)
  return totalSales - totalPayments
}
