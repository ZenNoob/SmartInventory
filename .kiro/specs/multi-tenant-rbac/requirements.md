# Requirements Document

## Introduction

Hệ thống Multi-tenant với phân quyền theo cấp bậc (RBAC - Role-Based Access Control) cho phép một khách hàng (tenant) đăng ký và quản lý nhiều cửa hàng, mỗi cửa hàng có nhiều tài khoản nhân viên với các quyền hạn khác nhau. Mỗi tenant sẽ có database riêng biệt để đảm bảo tính bảo mật và độc lập dữ liệu.

## Glossary

- **Tenant**: Khách hàng đăng ký sử dụng hệ thống, sở hữu một hoặc nhiều cửa hàng
- **Store**: Cửa hàng thuộc về một Tenant
- **User**: Tài khoản người dùng có thể đăng nhập vào hệ thống
- **Role**: Vai trò của người dùng trong hệ thống (Owner, Company Manager, Store Manager, Salesperson)
- **Permission**: Quyền hạn cụ thể cho từng chức năng trong hệ thống
- **Database Isolation**: Mỗi Tenant có database riêng biệt

## Requirements

### Requirement 1: Đăng ký Tenant mới

**User Story:** As a business owner, I want to register a new tenant account, so that I can manage my stores in the system.

#### Acceptance Criteria

1. WHEN a user submits registration form with valid business information, THE System SHALL create a new Tenant record with unique tenant_id within 5 seconds.
2. WHEN a new Tenant is created, THE System SHALL provision a dedicated database for that Tenant within 30 seconds.
3. WHEN database provisioning completes, THE System SHALL create an Owner account with full permissions for the Tenant.
4. IF registration fails due to duplicate email, THEN THE System SHALL display error message "Email đã được sử dụng".
5. WHILE Tenant database is being provisioned, THE System SHALL display provisioning progress to the user.

### Requirement 2: Quản lý cửa hàng

**User Story:** As a tenant owner, I want to create and manage multiple stores, so that I can organize my business operations.

#### Acceptance Criteria

1. WHEN Owner creates a new store, THE System SHALL create Store record linked to the Tenant's database.
2. THE System SHALL allow Owner to create unlimited stores within their Tenant.
3. WHEN Owner updates store information, THE System SHALL save changes and reflect them immediately.
4. IF Owner deletes a store with active sales data, THEN THE System SHALL require confirmation and archive the store instead of permanent deletion.
5. THE System SHALL display all stores belonging to the Tenant in the store selector.

### Requirement 3: Phân quyền theo cấp bậc

**User Story:** As a tenant owner, I want to assign different roles to users, so that I can control access to system features.

#### Acceptance Criteria

1. THE System SHALL support 4 role levels: Owner, Company Manager, Store Manager, Salesperson.
2. WHEN a user has Owner role, THE System SHALL grant access to all stores and all features within the Tenant.
3. WHEN a user has Company Manager role, THE System SHALL grant access to all stores with management features excluding user management.
4. WHEN a user has Store Manager role, THE System SHALL grant access only to assigned stores with full store-level features.
5. WHEN a user has Salesperson role, THE System SHALL grant access only to POS and basic sales features in assigned stores.

### Requirement 4: Quản lý tài khoản người dùng

**User Story:** As a store manager, I want to create accounts for my staff, so that they can access the system with appropriate permissions.

#### Acceptance Criteria

1. WHEN Owner or Company Manager creates a user, THE System SHALL allow assigning any role level below their own.
2. WHEN Store Manager creates a user, THE System SHALL only allow assigning Salesperson role for their managed stores.
3. THE System SHALL require unique email for each user within a Tenant.
4. WHEN a user is deactivated, THE System SHALL immediately revoke their access to the system.
5. THE System SHALL log all user management actions for audit purposes.

### Requirement 5: Đăng nhập và xác thực

**User Story:** As a user, I want to log in to the system, so that I can access features according to my role.

#### Acceptance Criteria

1. WHEN user provides valid credentials, THE System SHALL authenticate and redirect to appropriate dashboard based on role.
2. WHEN user logs in, THE System SHALL connect to the correct Tenant database based on user's tenant_id.
3. IF user provides invalid credentials 5 times, THEN THE System SHALL lock the account for 15 minutes.
4. THE System SHALL maintain user session for 8 hours before requiring re-authentication.
5. WHEN user switches between stores, THE System SHALL verify user has access to the target store before allowing switch.

### Requirement 6: Phân quyền chi tiết theo module

**User Story:** As an administrator, I want to configure granular permissions for each role, so that I can customize access control.

#### Acceptance Criteria

1. THE System SHALL support permissions: view, add, edit, delete for each module.
2. WHEN custom permissions are set for a user, THE System SHALL override default role permissions.
3. THE System SHALL enforce permissions at both UI and API levels.
4. WHEN a user attempts unauthorized action, THE System SHALL return 403 Forbidden response.
5. THE System SHALL cache user permissions for performance, refreshing on role or permission changes.

### Requirement 7: Database Isolation

**User Story:** As a tenant owner, I want my data to be completely isolated from other tenants, so that my business data is secure.

#### Acceptance Criteria

1. THE System SHALL create a separate database for each Tenant upon registration.
2. THE System SHALL use connection string routing to connect users to their Tenant's database.
3. IF a user attempts to access another Tenant's data, THEN THE System SHALL block the request and log the attempt.
4. THE System SHALL support database backup and restore per Tenant.
5. WHEN a Tenant is deleted, THE System SHALL archive the database for 30 days before permanent deletion.
