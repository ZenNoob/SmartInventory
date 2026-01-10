# Implementation Plan

## Phase 1: Master Database Setup

- [x] 1. Tạo Master Database và tables




  - [x] 1.1 Tạo script SQL cho Master Database schema


    - Tạo bảng Tenants với các cột: id, name, slug, email, phone, status, subscription_plan, database_name, database_server
    - Tạo bảng TenantUsers với các cột: id, tenant_id, email, password_hash, is_owner, status, last_login
    - Tạo indexes cho performance
    - _Requirements: 1.1, 1.2, 7.1_
  - [x] 1.2 Tạo migration script để chạy Master DB schema


    - Viết script TypeScript để execute SQL
    - Thêm error handling và rollback
    - _Requirements: 1.1_

- [x] 2. Cập nhật Tenant Database schema





  - [x] 2.1 Thêm cột role vào bảng Users


    - Thêm cột role với enum: owner, company_manager, store_manager, salesperson
    - Set default role cho users hiện tại
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 2.2 Tạo bảng UserStores


    - Tạo bảng mapping user_id với store_id
    - Thêm cột role_override cho custom permissions
    - _Requirements: 3.4, 3.5_
  - [x] 2.3 Tạo bảng Permissions


    - Tạo bảng lưu custom permissions per user per module
    - Hỗ trợ store-specific permissions
    - _Requirements: 6.1, 6.2_

## Phase 2: Backend Services

- [x] 3. Tạo Tenant Router Service















  - [x] 3.1 Implement TenantRouter class


    - Tạo connection pool management
    - Implement getConnection(tenantId) method
    - Cache connections để tối ưu performance
    - _Requirements: 7.2, 5.2_

  - [x] 3.2 Tạo Master Database repository

    - Implement TenantRepository cho CRUD operations
    - Implement TenantUserRepository cho authentication
    - _Requirements: 1.1, 5.1_

- [x] 4. Cập nhật Authentication Service





  - [x] 4.1 Refactor login flow để sử dụng Master DB







    - Lookup user trong Master DB trước
    - Lấy tenant_id và connect đến Tenant DB
    - Lấy full user info và permissions từ Tenant DB
    - _Requirements: 5.1, 5.2_
  - [x] 4.2 Cập nhật JWT token structure





    - Thêm tenant_id vào JWT payload
    - Thêm role và accessible stores

    --_Requirements: 5.1, 5.4_

  - [x] 4.3 Implement account lockout


    - Track failed login attempts
    - Lock account sau 5 lần sai
    - Auto unlock sau 15 phút
    - _Requirements: 5.3_

- [x] 5. Implement Permission Service



  - [x] 5.1 Tạo PermissionService class


    - Implement checkPermission(userId, module, action, storeId)
    - Load default permissions theo role
    - Merge với custom permissions
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 5.2 Tạo Permission middleware


    - Intercept API requests
    - Verify permissions trước khi xử lý
    - Return 403 nếu không có quyền
    - _Requirements: 6.3, 6.4_
  - [x] 5.3 Implement permission caching






    - Cache permissions trong Redis/memory
    - Invalidate cache khi role/permission thay đổi
    - _Requirements: 6.5_

- [x] 6. Tạo User Management API



  - [x] 6.1 Implement CRUD endpoints cho Users


    - POST /api/users - tạo user mới
    - GET /api/users - list users (theo role hierarchy)
    - PUT /api/users/:id - update user
    - DELETE /api/users/:id - deactivate user
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 6.2 Implement UserStores management


    - POST /api/users/:id/stores - assign stores
    - DELETE /api/users/:id/stores/:storeId - remove store access
    - _Requirements: 3.4, 3.5_


  - [x] 6.3 Implement audit logging

    - Log tất cả user management actions
    - Lưu who, what, when, where
    - _Requirements: 4.5_

## Phase 3: Frontend Updates

- [x] 7. Cập nhật Authentication UI









  - [x] 7.1 Cập nhật Login page


    - Hiển thị tenant info sau login
    - Redirect theo role
    - _Requirements: 5.1_

  - [x] 7.2 Cập nhật Store Selector

    - Chỉ hiển thị stores user có quyền access
    - Verify permission khi switch store
    - _Requirements: 5.5, 3.4, 3.5_

- [x] 8. Implement User Management UI













  - [x] 8.1 Tạo Users list page




    - Hiển thị danh sách users
    - Filter theo role, status
    - Chỉ hiển thị users mà current user có quyền quản lý
    - _Requirements: 4.1, 4.2_
  - [x] 8.2 Tạo User form (create/edit)


    - Form tạo/sửa user
    - Role selector (chỉ hiện roles thấp hơn current user)
    - Store assignment cho Store Manager và Salesperson
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 8.3 Implement permission editor

    - UI để customize permissions per user
    - Module-based permission toggles
    - _Requirements: 6.1, 6.2_

- [x] 9. Cập nhật Navigation và Access Control










  - [x] 9.1 Cập nhật Sidebar navigation

    - Ẩn/hiện menu items theo permissions
    - Disable items không có quyền
    - _Requirements: 6.3_
  - [x] 9.2 Cập nhật các pages với permission checks


    - Thêm permission guards cho routes
    - Hiển thị "Access Denied" cho unauthorized access
    - _Requirements: 6.3, 6.4_

## Phase 4: Tenant Registration (Future)

- [x] 10. Tenant Registration Flow








  - [x] 10.1 Tạo Registration API




    - POST /api/tenants/register
    - Validate business info
    - Create tenant record
    - _Requirements: 1.1, 1.4_
  - [x] 10.2 Implement Database Provisioning Service


    - Tạo database mới cho tenant
    - Run schema migrations
    - Create owner account
    - _Requirements: 1.2, 1.3, 1.5_

  - [x] 10.3 Tạo Registration UI

    - Multi-step registration form
    - Progress indicator cho provisioning
    - _Requirements: 1.1, 1.5_

- [x] 11. Testing






  - [x] 11.1 Unit tests cho TenantRouter



  - [x] 11.2 Unit tests cho PermissionService


  - [x] 11.3 Integration tests cho authentication flow

  - [x] 11.4 Security tests cho cross-tenant isolation




















