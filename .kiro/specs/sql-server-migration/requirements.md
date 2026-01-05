# Requirements Document

## Introduction

Dự án này nhằm chuyển đổi hệ thống SmartInventory từ Firebase sang SQL Server, đồng thời bổ sung tính năng quản lý đa cửa hàng (multi-store). Hệ thống cho phép một khách hàng (chủ doanh nghiệp) có thể sở hữu và quản lý nhiều cửa hàng khác nhau, với dữ liệu được lưu trữ trên SQL Server (118.69.126.49).

## Glossary

- **SmartInventory_System**: Hệ thống quản lý bán hàng và kho hàng trực tuyến
- **Store**: Cửa hàng - đơn vị kinh doanh độc lập thuộc sở hữu của một Owner
- **Owner**: Chủ sở hữu - người dùng có quyền tạo và quản lý nhiều cửa hàng
- **User**: Người dùng hệ thống (admin, accountant, inventory_manager, salesperson)
- **SQL_Server_Backend**: API backend kết nối với SQL Server database
- **Multi_Store_Context**: Ngữ cảnh cho phép chuyển đổi giữa các cửa hàng
- **Session**: Phiên làm việc của người dùng với một cửa hàng cụ thể

## Requirements

### Requirement 1: Quản lý đa cửa hàng (Multi-Store Management)

**User Story:** As an Owner, I want to create and manage multiple stores, so that I can operate different business locations from a single account.

#### Acceptance Criteria

1. WHEN an Owner logs in, THE SmartInventory_System SHALL display a list of all stores owned by that Owner.
2. WHEN an Owner selects "Create New Store", THE SmartInventory_System SHALL provide a form to input store name, address, phone, and business type.
3. WHILE a User is working in a Store context, THE SmartInventory_System SHALL display the current store name in the header.
4. WHEN a User switches stores using the store selector, THE SmartInventory_System SHALL load all data specific to the selected Store within 3 seconds.
5. IF a User attempts to access a Store they do not have permission for, THEN THE SmartInventory_System SHALL display an "Access Denied" message and redirect to the store selection page.

### Requirement 2: SQL Server Backend Integration

**User Story:** As a System Administrator, I want the system to connect to SQL Server instead of Firebase, so that data is stored in a centralized relational database.

#### Acceptance Criteria

1. THE SmartInventory_System SHALL connect to SQL Server at IP 118.69.126.49 using database "Data_QuanLyBanHang_Online".
2. WHEN a data operation (create, read, update, delete) is performed, THE SQL_Server_Backend SHALL execute the corresponding SQL query and return results within 2 seconds.
3. THE SmartInventory_System SHALL use API routes (Next.js API) to communicate with SQL Server through a secure connection.
4. IF a database connection fails, THEN THE SmartInventory_System SHALL display an error message and retry connection up to 3 times with 5-second intervals.
5. THE SmartInventory_System SHALL use parameterized queries to prevent SQL injection attacks.

### Requirement 3: User Authentication with SQL Server

**User Story:** As a User, I want to log in using my email and password stored in SQL Server, so that I can access the system securely.

#### Acceptance Criteria

1. WHEN a User submits login credentials, THE SmartInventory_System SHALL validate against the Users table in SQL Server.
2. THE SmartInventory_System SHALL hash passwords using bcrypt with a minimum of 10 salt rounds before storing.
3. WHEN authentication succeeds, THE SmartInventory_System SHALL create a JWT token valid for 24 hours.
4. IF a User enters incorrect credentials 5 times, THEN THE SmartInventory_System SHALL lock the account for 15 minutes.
5. WHEN a User logs out, THE SmartInventory_System SHALL invalidate the current session token.

### Requirement 4: Store-Scoped Data Management

**User Story:** As a Store Manager, I want all data (products, sales, customers) to be isolated per store, so that each store operates independently.

#### Acceptance Criteria

1. THE SmartInventory_System SHALL include a StoreId foreign key in all business data tables (Products, Sales, Customers, Suppliers, etc.).
2. WHEN querying data, THE SQL_Server_Backend SHALL automatically filter results by the current Store context.
3. WHEN creating new records, THE SmartInventory_System SHALL automatically assign the current StoreId to the record.
4. IF a User attempts to access data from another Store, THEN THE SmartInventory_System SHALL return an empty result set.
5. THE SmartInventory_System SHALL support data export per Store in Excel format.

### Requirement 5: Product Management with SQL Server

**User Story:** As an Inventory Manager, I want to manage products with data stored in SQL Server, so that product information is persistent and queryable.

#### Acceptance Criteria

1. WHEN a User creates a product, THE SmartInventory_System SHALL insert a record into the Products table with all required fields (name, barcode, categoryId, unitId, sellingPrice, status).
2. WHEN a User searches for products, THE SmartInventory_System SHALL execute a SQL query with LIKE operator and return matching results within 1 second.
3. THE SmartInventory_System SHALL support pagination with 20 items per page for product listings.
4. WHEN a User updates product stock through purchase orders, THE SmartInventory_System SHALL update the PurchaseLots table with import date, quantity, and cost.
5. IF a product's stock falls below the lowStockThreshold, THEN THE SmartInventory_System SHALL display a warning indicator on the product list.

### Requirement 6: Sales Transaction Processing

**User Story:** As a Salesperson, I want to create sales transactions that are saved to SQL Server, so that all sales data is recorded accurately.

#### Acceptance Criteria

1. WHEN a sale is completed, THE SmartInventory_System SHALL insert records into Sales and SalesItems tables within a single database transaction.
2. THE SmartInventory_System SHALL generate unique invoice numbers in format "INV-{StoreCode}-{YYYYMMDD}-{Sequence}".
3. WHEN a sale includes customer debt, THE SmartInventory_System SHALL update the customer's remainingDebt field atomically.
4. IF a database transaction fails, THEN THE SmartInventory_System SHALL rollback all changes and display an error message.
5. THE SmartInventory_System SHALL support VAT calculation based on store settings.

### Requirement 7: Customer and Debt Management

**User Story:** As an Accountant, I want to track customer debts and payments in SQL Server, so that I can generate accurate financial reports.

#### Acceptance Criteria

1. WHEN a payment is recorded, THE SmartInventory_System SHALL insert a record into the Payments table and update the customer's debt balance.
2. THE SmartInventory_System SHALL calculate and display total debt per customer with payment history.
3. WHEN generating debt reports, THE SQL_Server_Backend SHALL aggregate data using SQL GROUP BY and return results within 3 seconds.
4. IF a customer exceeds their credit limit, THEN THE SmartInventory_System SHALL display a warning before completing the sale.
5. THE SmartInventory_System SHALL support loyalty points calculation and tier-based discounts per store configuration.

### Requirement 8: Reporting with SQL Server Queries

**User Story:** As a Store Owner, I want to view reports generated from SQL Server data, so that I can make informed business decisions.

#### Acceptance Criteria

1. WHEN a User requests a sales report, THE SQL_Server_Backend SHALL execute aggregation queries and return daily/weekly/monthly summaries.
2. THE SmartInventory_System SHALL support date range filtering for all reports.
3. WHEN generating inventory reports, THE SmartInventory_System SHALL calculate current stock using FIFO method from PurchaseLots.
4. THE SmartInventory_System SHALL support exporting reports to PDF and Excel formats.
5. WHEN viewing the dashboard, THE SmartInventory_System SHALL display key metrics (total sales, revenue, top products) for the current Store.

### Requirement 9: User and Permission Management per Store

**User Story:** As an Owner, I want to assign users to specific stores with defined permissions, so that I can control access to each store's data.

#### Acceptance Criteria

1. WHEN an Owner creates a user, THE SmartInventory_System SHALL allow assignment to one or more Stores.
2. THE SmartInventory_System SHALL support role-based permissions (admin, accountant, inventory_manager, salesperson, custom).
3. WHEN a User with custom role accesses a module, THE SmartInventory_System SHALL check permissions (view, add, edit, delete) before allowing the action.
4. IF a User does not have permission for an action, THEN THE SmartInventory_System SHALL hide the corresponding UI elements.
5. THE SmartInventory_System SHALL log all user actions with timestamp, userId, storeId, and action type.

### Requirement 10: POS (Point of Sale) Integration

**User Story:** As a Salesperson, I want to use the POS interface to quickly process sales, so that I can serve customers efficiently.

#### Acceptance Criteria

1. WHEN a User opens POS, THE SmartInventory_System SHALL load products for the current Store with images and prices.
2. THE SmartInventory_System SHALL support barcode scanning to add products to the cart.
3. WHEN a sale is completed in POS, THE SmartInventory_System SHALL print a receipt in the configured format (A4, A5, 80mm, 58mm).
4. THE SmartInventory_System SHALL support shift management with starting cash, ending cash, and cash difference calculation.
5. WHILE a shift is active, THE SmartInventory_System SHALL track all sales and payments for that shift.
