/**
 * Repository Factory and Exports
 * 
 * This module provides a centralized way to access all repositories
 * with dependency injection support.
 */

// Export base repository classes and types
export {
  BaseRepository,
  TransactionRepository,
  type QueryOptions,
  type PaginationOptions,
  type PaginatedResult,
} from './base-repository';

// Export Tenant repository (Master DB)
export {
  TenantRepository,
  tenantRepository,
  type Tenant,
  type CreateTenantInput,
  type UpdateTenantInput,
} from './tenant-repository';

// Export TenantUser repository (Master DB)
export {
  TenantUserRepository,
  tenantUserRepository,
  type TenantUser,
  type TenantUserWithTenant,
  type CreateTenantUserInput,
  type UpdateTenantUserInput,
  type LoginResult,
} from './tenant-user-repository';

// Export Category repository
export {
  CategoryRepository,
  categoryRepository,
  type Category,
} from './category-repository';

// Export Unit repository
export {
  UnitRepository,
  unitRepository,
  type Unit,
  type UnitWithBaseUnit,
} from './unit-repository';

// Export Product repository
export {
  ProductRepository,
  productRepository,
  type Product,
  type ProductWithStock,
} from './product-repository';

// Export Supplier repository
export {
  SupplierRepository,
  supplierRepository,
  type Supplier,
  type SupplierWithDebt,
} from './supplier-repository';

// Export Customer repository
export {
  CustomerRepository,
  customerRepository,
  type Customer,
  type CustomerWithDebt,
} from './customer-repository';

// Export PurchaseOrder repository
export {
  PurchaseOrderRepository,
  purchaseOrderRepository,
  type PurchaseOrder,
  type PurchaseOrderItem,
  type PurchaseLot as PurchaseOrderLot,
  type PurchaseOrderWithDetails,
  type PurchaseOrderItemWithProduct,
  type CreatePurchaseOrderInput,
  type CreatePurchaseOrderItemInput,
} from './purchase-order-repository';

// Export Sales repository
export {
  SalesRepository,
  salesRepository,
  type Sale,
  type SalesItem,
} from './sales-repository';

// Export Payment repository (customer payments)
export {
  PaymentRepository,
  paymentRepository,
  type Payment,
} from './payment-repository';

// Export SupplierPayment repository
export {
  SupplierPaymentRepository,
  supplierPaymentRepository,
  type SupplierPayment,
  type SupplierPaymentWithSupplier,
} from './supplier-payment-repository';

// Export CashTransaction repository
export {
  CashTransactionRepository,
  cashTransactionRepository,
  type CashTransaction,
  type CashFlowSummary,
} from './cash-transaction-repository';

// Export Shift repository
export {
  ShiftRepository,
  shiftRepository,
  type Shift,
  type ShiftWithSummary,
  type CreateShiftInput,
  type CloseShiftInput,
} from './shift-repository';

// Export User repository
export {
  UserRepository,
  userRepository,
  type User,
  type UserWithStores,
  type UserStoreAssignment,
  type AssignStoreInput,
  type CreateUserInput,
  type UpdateUserInput,
} from './user-repository';

// Export Permission repository
export {
  PermissionRepository,
  permissionRepository,
  type PermissionRecord,
  type SetPermissionInput,
} from './permission-repository';

// Export AuditLog repository
export {
  AuditLogRepository,
  auditLogRepository,
  type AuditLog,
  type AuditAction,
  type CreateAuditLogInput,
  type AuditLogFilterOptions,
  type PaginatedAuditLogs,
} from './audit-log-repository';

// Export OnlineStore repository
export {
  OnlineStoreRepository,
  onlineStoreRepository,
  type OnlineStore,
  type CreateOnlineStoreInput,
  type UpdateOnlineStoreInput,
} from './online-store-repository';

// Export OnlineProduct repository
export {
  OnlineProductRepository,
  onlineProductRepository,
  type OnlineProduct,
  type OnlineProductWithDetails,
  type CreateOnlineProductInput,
  type UpdateOnlineProductInput,
} from './online-product-repository';

// Export ShoppingCart repository
export {
  ShoppingCartRepository,
  shoppingCartRepository,
  type ShoppingCart,
  type CartItem,
  type CartItemWithProduct,
  type ShoppingCartWithItems,
} from './shopping-cart-repository';

// Export OnlineOrder repository
export {
  OnlineOrderRepository,
  onlineOrderRepository,
  type OnlineOrder,
  type OnlineOrderItem,
  type OnlineOrderWithItems,
  type OrderStatus,
  type PaymentStatus,
  type PaymentMethod,
  type ShippingAddress,
  type CreateOnlineOrderInput,
  type CreateOnlineOrderItemInput,
  type OrderFilterOptions,
} from './online-order-repository';

// Export OnlineCustomer repository
export {
  OnlineCustomerRepository,
  onlineCustomerRepository,
  type OnlineCustomer,
  type CustomerAddress,
  type OnlineCustomerWithAddresses,
  type CreateOnlineCustomerInput,
  type CreateCustomerAddressInput,
} from './online-customer-repository';

// Export ShippingZone repository
export {
  ShippingZoneRepository,
  shippingZoneRepository,
  type ShippingZone,
  type CreateShippingZoneInput,
  type UpdateShippingZoneInput,
  type ShippingFeeResult,
} from './shipping-zone-repository';

/**
 * Repository container interface for dependency injection
 */
export interface RepositoryContainer {
  // Repositories will be added here as they are implemented
  // Example:
  // category: CategoryRepository;
  // unit: UnitRepository;
  // product: ProductRepository;
  // supplier: SupplierRepository;
  // customer: CustomerRepository;
  // sale: SalesRepository;
  // purchaseOrder: PurchaseOrderRepository;
  // payment: PaymentRepository;
  // supplierPayment: SupplierPaymentRepository;
  // cashTransaction: CashTransactionRepository;
  // shift: ShiftRepository;
  // user: UserRepository;
  // auditLog: AuditLogRepository;
}

/**
 * Repository factory class implementing dependency injection pattern
 * Provides singleton instances of repositories
 */
class RepositoryFactory {
  private static instance: RepositoryFactory;
  private repositories: Map<string, unknown> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance of the factory
   */
  static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory();
    }
    return RepositoryFactory.instance;
  }

  /**
   * Register a repository instance
   */
  register<T>(name: string, repository: T): void {
    this.repositories.set(name, repository);
  }

  /**
   * Get a repository by name
   */
  get<T>(name: string): T {
    const repository = this.repositories.get(name);
    if (!repository) {
      throw new Error(`Repository '${name}' not registered`);
    }
    return repository as T;
  }

  /**
   * Check if a repository is registered
   */
  has(name: string): boolean {
    return this.repositories.has(name);
  }

  /**
   * Clear all registered repositories (useful for testing)
   */
  clear(): void {
    this.repositories.clear();
  }
}

// Export singleton factory instance
export const repositoryFactory = RepositoryFactory.getInstance();

/**
 * Helper function to get a repository from the factory
 */
export function getRepository<T>(name: string): T {
  return repositoryFactory.get<T>(name);
}

/**
 * Helper function to register a repository
 */
export function registerRepository<T>(name: string, repository: T): void {
  repositoryFactory.register(name, repository);
}

// Repository names constants for type safety
export const REPOSITORY_NAMES = {
  // Master DB repositories
  TENANT: 'tenant',
  TENANT_USER: 'tenantUser',
  // Tenant DB repositories
  CATEGORY: 'category',
  UNIT: 'unit',
  PRODUCT: 'product',
  SUPPLIER: 'supplier',
  CUSTOMER: 'customer',
  SALE: 'sale',
  PURCHASE_ORDER: 'purchaseOrder',
  PAYMENT: 'payment',
  SUPPLIER_PAYMENT: 'supplierPayment',
  CASH_TRANSACTION: 'cashTransaction',
  SHIFT: 'shift',
  USER: 'user',
  PERMISSION: 'permission',
  AUDIT_LOG: 'auditLog',
  STORE: 'store',
  ONLINE_STORE: 'onlineStore',
  ONLINE_PRODUCT: 'onlineProduct',
  SHOPPING_CART: 'shoppingCart',
  ONLINE_ORDER: 'onlineOrder',
  ONLINE_CUSTOMER: 'onlineCustomer',
  SHIPPING_ZONE: 'shippingZone',
} as const;

export type RepositoryName = typeof REPOSITORY_NAMES[keyof typeof REPOSITORY_NAMES];
