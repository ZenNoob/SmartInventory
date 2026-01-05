# Implementation Plan

- [x] 1. Setup SQL Server Connection và Database Schema





  - [x] 1.1 Install mssql package và setup database connection


    - Install `mssql` và `@types/mssql` packages
    - Create `src/lib/db/connection.ts` với connection pool configuration
    - Create `src/lib/db/query.ts` với helper functions cho parameterized queries
    - Add environment variables cho database credentials
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 1.2 Create SQL Server database tables

    - Create script `scripts/create-tables.sql` với tất cả tables từ design
    - Execute script trên SQL Server để tạo tables
    - Create indexes cho các foreign keys và frequently queried columns
    - _Requirements: 2.1, 4.1_

  - [x] 1.3 Implement transaction helper

    - Create `src/lib/db/transaction.ts` với `withTransaction` function
    - Handle rollback on errors
    - _Requirements: 2.4, 6.4_

- [x] 2. Implement Authentication System






  - [x] 2.1 Create auth utilities

    - Create `src/lib/auth/password.ts` với bcrypt hash/verify functions
    - Create `src/lib/auth/jwt.ts` với token generation/validation
    - Create `src/lib/auth/middleware.ts` cho API route protection
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.2 Implement auth API routes

    - Create `src/app/api/auth/login/route.ts` với login logic
    - Create `src/app/api/auth/logout/route.ts` với token invalidation
    - Create `src/app/api/auth/me/route.ts` để get current user
    - Implement failed login attempt tracking và account locking
    - _Requirements: 3.1, 3.3, 3.4, 3.5_
  - [x] 2.3 Update login page to use SQL Server auth


    - Modify `src/app/(auth)/login/page.tsx` để call new auth API
    - Store JWT token in httpOnly cookie
    - Handle login errors và display messages
    - _Requirements: 3.1, 3.4_

- [x] 3. Implement Store Management (Multi-Store)





  - [x] 3.1 Create Store Context và Provider


    - Create `src/contexts/store-context.tsx` với StoreContext
    - Implement store switching logic
    - Persist selected store in localStorage
    - _Requirements: 1.3, 1.4_

  - [x] 3.2 Implement Store API routes

    - Create `src/app/api/stores/route.ts` (GET all stores, POST create store)
    - Create `src/app/api/stores/[storeId]/route.ts` (GET, PUT, DELETE)
    - Add store validation và ownership checks
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 3.3 Create Store Selection UI

    - Create `src/components/store-selector.tsx` dropdown component
    - Update `src/components/header.tsx` để hiển thị store selector
    - Create store list page cho Owner
    - _Requirements: 1.1, 1.3_

- [x] 4. Implement Base Repository Pattern





  - [x] 4.1 Create base repository class


    - Create `src/lib/repositories/base-repository.ts` với CRUD operations
    - Implement automatic storeId filtering
    - Add pagination support
    - _Requirements: 4.2, 4.3, 5.3_

  - [x] 4.2 Create repository factory

    - Create `src/lib/repositories/index.ts` exporting all repositories
    - Implement dependency injection pattern
    - _Requirements: 4.2_

- [x] 5. Implement Category và Unit Management





  - [x] 5.1 Create Category repository và API


    - Create `src/lib/repositories/category-repository.ts`
    - Create `src/app/api/categories/route.ts` (GET, POST)
    - Create `src/app/api/categories/[categoryId]/route.ts` (GET, PUT, DELETE)
    - _Requirements: 4.1, 4.2_

  - [x] 5.2 Create Unit repository và API

    - Create `src/lib/repositories/unit-repository.ts`
    - Create `src/app/api/units/route.ts` (GET, POST)
    - Create `src/app/api/units/[unitId]/route.ts` (GET, PUT, DELETE)
    - Support unit conversion calculations
    - _Requirements: 4.1, 4.2_

  - [x] 5.3 Update Category và Unit pages

    - Modify `src/app/categories/actions.ts` để call SQL Server API
    - Modify `src/app/units/actions.ts` để call SQL Server API
    - Update components để use new data fetching
    - _Requirements: 4.2, 4.3_

- [x] 6. Implement Product Management





  - [x] 6.1 Create Product repository


    - Create `src/lib/repositories/product-repository.ts`
    - Implement findByBarcode, findByCategory methods
    - Implement stock calculation từ PurchaseLots (FIFO)
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 6.2 Create Product API routes

    - Create `src/app/api/products/route.ts` (GET with pagination, POST)
    - Create `src/app/api/products/[productId]/route.ts` (GET, PUT, DELETE)
    - Create `src/app/api/products/barcode/[barcode]/route.ts` for barcode lookup
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.3 Update Product pages

    - Modify `src/app/products/actions.ts` để call SQL Server API
    - Update product list với pagination
    - Add low stock warning indicator
    - _Requirements: 5.3, 5.5_

- [x] 7. Implement Supplier Management






  - [x] 7.1 Create Supplier repository và API

    - Create `src/lib/repositories/supplier-repository.ts`
    - Create `src/app/api/suppliers/route.ts` (GET, POST)
    - Create `src/app/api/suppliers/[supplierId]/route.ts` (GET, PUT, DELETE)
    - _Requirements: 4.1, 4.2_
  - [x] 7.2 Update Supplier pages


    - Modify `src/app/suppliers/actions.ts` để call SQL Server API
    - Update supplier list và form components
    - _Requirements: 4.2, 4.3_

- [x] 8. Implement Customer Management





  - [x] 8.1 Create Customer repository


    - Create `src/lib/repositories/customer-repository.ts`
    - Implement debt calculation methods
    - Implement loyalty points và tier methods
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 8.2 Create Customer API routes

    - Create `src/app/api/customers/route.ts` (GET, POST)
    - Create `src/app/api/customers/[customerId]/route.ts` (GET, PUT, DELETE)
    - Create `src/app/api/customers/[customerId]/debt/route.ts` for debt info
    - _Requirements: 7.1, 7.2, 7.4_

  - [x] 8.3 Update Customer pages

    - Modify `src/app/customers/actions.ts` để call SQL Server API
    - Update customer detail page với debt history
    - Add credit limit warning
    - _Requirements: 7.2, 7.4_

- [x] 9. Implement Purchase Order Management





  - [x] 9.1 Create PurchaseOrder repository


    - Create `src/lib/repositories/purchase-order-repository.ts`
    - Implement createWithItems method với transaction
    - Auto-create PurchaseLots khi tạo purchase order
    - _Requirements: 5.4, 4.1_

  - [x] 9.2 Create PurchaseOrder API routes

    - Create `src/app/api/purchases/route.ts` (GET, POST)
    - Create `src/app/api/purchases/[purchaseId]/route.ts` (GET, PUT, DELETE)
    - _Requirements: 5.4, 4.2_
  - [x] 9.3 Update Purchase pages


    - Modify `src/app/purchases/actions.ts` để call SQL Server API
    - Update purchase order form và list
    - _Requirements: 5.4_

- [x] 10. Implement Sales Transaction System





  - [x] 10.1 Create Sales repository


    - Create `src/lib/repositories/sales-repository.ts`
    - Implement createSale với transaction (Sales + SalesItems + update stock)
    - Implement invoice number generation (INV-{StoreCode}-{YYYYMMDD}-{Seq})
    - Update customer debt atomically
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 10.2 Create Sales API routes

    - Create `src/app/api/sales/route.ts` (GET, POST)
    - Create `src/app/api/sales/[saleId]/route.ts` (GET, PUT, DELETE)
    - Handle VAT calculation
    - _Requirements: 6.1, 6.5_


  - [x] 10.3 Update Sales pages





    - Modify `src/app/sales/actions.ts` để call SQL Server API
    - Update sales list và detail pages
    - _Requirements: 6.1, 6.2_

- [x] 11. Implement Payment Management





  - [x] 11.1 Create Payment repositories


    - Create `src/lib/repositories/payment-repository.ts` for customer payments
    - Create `src/lib/repositories/supplier-payment-repository.ts`
    - Update customer/supplier debt on payment
    - _Requirements: 7.1_

  - [x] 11.2 Create Payment API routes

    - Create `src/app/api/payments/route.ts` (GET, POST)
    - Create `src/app/api/supplier-payments/route.ts` (GET, POST)
    - _Requirements: 7.1_


  - [x] 11.3 Update Payment actions





    - Modify `src/app/payments/actions.ts` để call SQL Server API
    - _Requirements: 7.1_

- [x] 12. Implement Cash Flow Management





  - [x] 12.1 Create CashTransaction repository và API


    - Create `src/lib/repositories/cash-transaction-repository.ts`
    - Create `src/app/api/cash-flow/route.ts` (GET, POST)
    - _Requirements: 4.1, 4.2_

  - [x] 12.2 Update Cash Flow page

    - Modify `src/app/cash-flow/actions.ts` để call SQL Server API
    - _Requirements: 4.2_

- [x] 13. Implement Shift Management






  - [x] 13.1 Create Shift repository và API

    - Create `src/lib/repositories/shift-repository.ts`
    - Create `src/app/api/shifts/route.ts` (GET, POST)
    - Create `src/app/api/shifts/[shiftId]/route.ts` (GET, PUT - close shift)
    - Track sales và payments per shift
    - _Requirements: 10.4, 10.5_


  - [x] 13.2 Update Shift pages





    - Modify shift pages để call SQL Server API
    - Calculate cash difference on shift close
    - _Requirements: 10.4, 10.5_
-

- [x] 14. Implement POS System




  - [x] 14.1 Update POS to use SQL Server


    - Modify `src/app/pos/actions.ts` để call SQL Server API
    - Implement barcode scanning với product lookup
    - _Requirements: 10.1, 10.2_

  - [x] 14.2 Integrate POS với Shift

    - Link sales to active shift
    - Update shift totals on each sale
    - _Requirements: 10.4, 10.5_

- [x] 15. Implement Reporting System





  - [x] 15.1 Create Report API routes


    - Create `src/app/api/reports/sales/route.ts` với aggregation queries
    - Create `src/app/api/reports/inventory/route.ts` với FIFO stock calculation
    - Create `src/app/api/reports/debt/route.ts` với customer debt summary
    - Create `src/app/api/reports/profit/route.ts` với profit calculation
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 15.2 Update Report pages

    - Update all report pages trong `src/app/reports/` để call SQL Server APIs
    - Implement date range filtering
    - _Requirements: 8.1, 8.2_

  - [x] 15.3 Implement Export functionality

    - Add PDF export using existing jspdf
    - Add Excel export using existing xlsx
    - _Requirements: 8.4_

- [x] 16. Implement User và Permission Management






  - [x] 16.1 Create User repository và API

    - Create `src/lib/repositories/user-repository.ts`
    - Create `src/app/api/users/route.ts` (GET, POST)
    - Create `src/app/api/users/[userId]/route.ts` (GET, PUT, DELETE)
    - Implement user-store assignment
    - _Requirements: 9.1, 9.2_

  - [x] 16.2 Update User pages

    - Modify `src/app/users/actions.ts` để call SQL Server API
    - Add store assignment UI
    - _Requirements: 9.1, 9.2_

  - [x] 16.3 Implement Permission checking

    - Create `src/lib/auth/permissions.ts` với permission check functions
    - Update components để hide/show based on permissions
    - _Requirements: 9.3, 9.4_

- [x] 17. Implement Audit Logging





  - [x] 17.1 Create AuditLog repository


    - Create `src/lib/repositories/audit-log-repository.ts`
    - Create middleware để auto-log actions
    - _Requirements: 9.5_

- [x] 18. Update Settings Management






  - [x] 18.1 Create Settings API

    - Create `src/app/api/settings/route.ts` để get/update store settings
    - Store settings as JSON in Stores table
    - _Requirements: 4.1_

  - [x] 18.2 Update Settings page

    - Modify `src/app/settings/actions.ts` để call SQL Server API
    - _Requirements: 4.1_

- [x] 19. Remove Firebase Dependencies






  - [x] 19.1 Remove Firebase imports và usage

    - Remove Firebase provider từ `src/app/providers.tsx`
    - Remove Firebase hooks từ components
    - Delete `src/firebase/` directory
    - _Requirements: 2.1_

  - [x] 19.2 Update package.json

    - Remove firebase và firebase-admin packages
    - Clean up unused dependencies
    - _Requirements: 2.1_

- [x] 20. Final Integration và Testing





  - [x] 20.1 Update main layout và providers


    - Update `src/app/layout.tsx` với new providers
    - Add StoreProvider wrapper
    - _Requirements: 1.3, 1.4_

  - [x] 20.2 Update navigation

    - Update `src/components/main-nav.tsx` với store context
    - Update `src/components/header.tsx` với store selector
    - _Requirements: 1.3_

  - [x] 20.3 Write integration tests

    - Test authentication flow
    - Test multi-store data isolation
    - Test sales transaction với stock update
      - _Requirements: 2.2, 4.4, 6.4_
  