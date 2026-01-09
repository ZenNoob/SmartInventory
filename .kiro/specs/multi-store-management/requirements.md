# Requirements Document

## Introduction

Tính năng quản lý nhiều cửa hàng cho phép một người dùng (chủ doanh nghiệp) có thể tạo và quản lý nhiều cửa hàng khác nhau trong cùng một tài khoản. Mỗi cửa hàng có dữ liệu riêng biệt (sản phẩm, khách hàng, đơn hàng, nhân viên) và người dùng có thể chuyển đổi giữa các cửa hàng một cách dễ dàng.

## Glossary

- **Store**: Một cửa hàng trong hệ thống, có dữ liệu riêng biệt
- **User**: Người dùng hệ thống (chủ cửa hàng hoặc nhân viên)
- **Owner**: Chủ sở hữu cửa hàng, có toàn quyền quản lý
- **Store_Switcher**: Component UI cho phép chuyển đổi giữa các cửa hàng
- **UserStores**: Bảng liên kết nhiều-nhiều giữa User và Store
- **Active_Store**: Cửa hàng đang được chọn để làm việc

## Requirements

### Requirement 1: Tạo cửa hàng mới

**User Story:** As a business owner, I want to create multiple stores, so that I can manage different business locations separately.

#### Acceptance Criteria

1. WHEN the user clicks "Tạo cửa hàng mới", THE System SHALL display a form with fields: name, description, logo, and address.
2. WHEN the user submits valid store information, THE System SHALL create a new store record and assign the user as owner.
3. IF the store name is empty or exceeds 255 characters, THEN THE System SHALL display a validation error message within 100ms.
4. WHEN a store is created successfully, THE System SHALL automatically add the creator to UserStores table with owner role.

### Requirement 2: Chuyển đổi cửa hàng

**User Story:** As a user with multiple stores, I want to switch between stores quickly, so that I can manage different locations without logging out.

#### Acceptance Criteria

1. THE System SHALL display a Store_Switcher component in the header showing the Active_Store name.
2. WHEN the user clicks the Store_Switcher, THE System SHALL display a dropdown list of all stores the user has access to.
3. WHEN the user selects a different store, THE System SHALL update the Active_Store and reload relevant data within 500ms.
4. THE System SHALL persist the Active_Store selection in localStorage so it remains after page refresh.

### Requirement 3: Quản lý danh sách cửa hàng

**User Story:** As a business owner, I want to view and manage all my stores, so that I can update store information or deactivate stores.

#### Acceptance Criteria

1. THE System SHALL display a "Quản lý cửa hàng" page listing all stores the user owns.
2. WHEN the user clicks "Chỉnh sửa" on a store, THE System SHALL display an edit form with current store information.
3. WHEN the user updates store information, THE System SHALL save changes and display a success notification.
4. WHEN the user clicks "Vô hiệu hóa", THE System SHALL set the store status to "inactive" and prevent access to that store.

### Requirement 4: Xóa cửa hàng vĩnh viễn

**User Story:** As a business owner, I want to permanently delete a store, so that I can remove stores that are no longer needed from the system.

#### Acceptance Criteria

1. THE System SHALL display a "Xóa" button next to each store in the store management page for owners only.
2. WHEN the user clicks "Xóa", THE System SHALL display a confirmation dialog warning about permanent deletion.
3. WHEN the user confirms deletion, THE System SHALL permanently remove the store and all associated data from the database.
4. IF the store being deleted is the Active_Store, THEN THE System SHALL automatically switch to another available store.
5. IF the store has associated data (products, orders, etc.), THEN THE System SHALL warn the user and require explicit confirmation.

### Requirement 5: Phân quyền nhân viên theo cửa hàng

**User Story:** As a store owner, I want to assign employees to specific stores, so that they can only access data from their assigned stores.

#### Acceptance Criteria

1. THE System SHALL allow owners to assign users to specific stores via the UserStores relationship.
2. WHEN a user logs in, THE System SHALL only show stores they have been assigned to.
3. IF a user attempts to access a store they are not assigned to, THEN THE System SHALL return a 403 Forbidden error.
4. THE System SHALL allow owners to remove user access from a store by deleting the UserStores record.

### Requirement 5: Phân quyền nhân viên theo cửa hàng

**User Story:** As a store owner, I want to assign employees to specific stores, so that they can only access data from their assigned stores.

#### Acceptance Criteria

1. THE System SHALL allow owners to assign users to specific stores via the UserStores relationship.
2. WHEN a user logs in, THE System SHALL only show stores they have been assigned to.
3. IF a user attempts to access a store they are not assigned to, THEN THE System SHALL return a 403 Forbidden error.
4. THE System SHALL allow owners to remove user access from a store by deleting the UserStores record.

### Requirement 6: Dữ liệu riêng biệt theo cửa hàng

**User Story:** As a store manager, I want each store to have separate data, so that products, customers, and sales are not mixed between stores.

#### Acceptance Criteria

1. THE System SHALL filter all data queries by the Active_Store's store_id.
2. WHEN creating new records (products, customers, sales), THE System SHALL automatically set the store_id to the Active_Store.
3. THE System SHALL include store_id in all API requests via the X-Store-Id header.
4. IF the X-Store-Id header is missing, THEN THE System SHALL return a 400 Bad Request error.
