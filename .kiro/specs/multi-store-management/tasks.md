# Implementation Plan

- [x] 1. Mở rộng Backend API cho Store Management





  - [x] 1.1 Thêm endpoint POST /api/stores để tạo cửa hàng mới


    - Validate input (name required, max 255 chars)
    - Generate slug từ name
    - Insert vào bảng Stores với owner_id = current user
    - Tự động thêm record vào UserStores
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Thêm endpoint PUT /api/stores/:id để cập nhật cửa hàng

    - Kiểm tra user là owner của store
    - Validate và update các fields
    - _Requirements: 3.2, 3.3_
  - [x] 1.3 Thêm endpoint DELETE /api/stores/:id để vô hiệu hóa cửa hàng

    - Kiểm tra user là owner
    - Set status = 'inactive' (soft delete)
    - _Requirements: 3.4_
  - [x] 1.4 Viết unit tests cho store API endpoints


    - Test create store với valid/invalid data
    - Test update store authorization
    - Test deactivate store
    - _Requirements: 1.3, 3.2, 3.4_

- [x] 8. Thêm tính năng xóa cửa hàng vĩnh viễn





  - [x] 8.1 Thêm endpoint DELETE /api/stores/:id/permanent để xóa vĩnh viễn


    - Kiểm tra user là owner của store
    - Yêu cầu query param `?confirm=true`
    - Xóa tất cả dữ liệu liên quan (UserStores, Products, Orders, Customers, etc.)
    - Xóa store khỏi database
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 8.2 Thêm method deleteStorePermanently trong api-client.ts


    - DELETE request với store id và confirm param
    - _Requirements: 4.3_

  - [x] 8.3 Thêm function deleteStorePermanently vào StoreContext


    - Gọi API, remove from stores list, switch store nếu cần
    - _Requirements: 4.3, 4.4_

  - [x] 8.4 Thêm nút "Xóa" và DeleteStoreDialog vào StoreManagementPage


    - Nút xóa màu đỏ bên cạnh nút vô hiệu hóa
    - Dialog xác nhận với warning về xóa vĩnh viễn
    - Yêu cầu nhập tên store để xác nhận
    - _Requirements: 4.1, 4.2, 4.5_



  - [ ] 8.5 Viết unit tests cho tính năng xóa cửa hàng
    - Test backend endpoint với valid/invalid requests
    - Test StoreContext deleteStorePermanently function
    - Test DeleteStoreDialog component
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Cập nhật Frontend API Client





  - [x] 2.1 Thêm method createStore trong api-client.ts


    - POST request với store data
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Thêm method updateStore trong api-client.ts
    - PUT request với store id và data
    - _Requirements: 3.2, 3.3_
  - [x] 2.3 Thêm method deleteStore trong api-client.ts

    - DELETE request với store id
    - _Requirements: 3.4_

- [x] 3. Mở rộng StoreContext





  - [x] 3.1 Thêm function createStore vào StoreContext


    - Gọi API, refresh stores list, auto-switch to new store
    - _Requirements: 1.2, 1.4_
  - [x] 3.2 Thêm function updateStore vào StoreContext

    - Gọi API, update local state
    - _Requirements: 3.3_
  - [x] 3.3 Thêm function deactivateStore vào StoreContext

    - Gọi API, remove from stores list, switch store nếu cần
    - _Requirements: 3.4_
  - [x] 3.4 Viết unit tests cho StoreContext functions


    - Test createStore flow
    - Test updateStore state update
    - Test deactivateStore và auto-switch
    - _Requirements: 1.4, 3.3, 3.4_

- [x] 4. Tạo UI Components cho Store Management





  - [x] 4.1 Tạo CreateStoreDialog component


    - Form với fields: name, description, address, phone
    - Validation và error handling
    - _Requirements: 1.1, 1.3_
  - [x] 4.2 Tạo EditStoreDialog component


    - Pre-fill form với store data hiện tại
    - Save và cancel buttons
    - _Requirements: 3.2_

  - [x] 4.3 Tạo StoreManagementPage tại /stores


    - List tất cả stores của user
    - Actions: Edit, Deactivate
    - Button tạo store mới

    - _Requirements: 3.1, 3.4_
  - [x] 4.4 Viết component tests cho UI

    - Test CreateStoreDialog validation
    - Test EditStoreDialog pre-fill
    - Test StoreManagementPage actions
    - _Requirements: 1.3, 3.2, 3.4_

- [x] 5. Cập nhật Navigation và Routing





  - [x] 5.1 Thêm link "Quản lý cửa hàng" vào sidebar/menu


    - Chỉ hiển thị cho owner role
    - _Requirements: 3.1_
  - [x] 5.2 Cập nhật StoreSelector để có option mở trang quản lý


    - Thêm link/button trong dropdown
    - _Requirements: 2.1, 2.2_

- [x] 6. Xử lý Edge Cases





  - [x] 6.1 Hiển thị prompt tạo store khi user chưa có store nào


    - Redirect hoặc show dialog
    - _Requirements: 1.1_
  - [x] 6.2 Xử lý khi store đang active bị deactivate


    - Auto-switch sang store khác hoặc show prompt
    - _Requirements: 3.4, 2.3_

- [x] 7. Integration Tests




  - [x] 7.1 Viết E2E tests cho full flow


    - Test tạo store mới từ đầu đến cuối
    - Test switch giữa các stores
    - Test edit và deactivate store
    - _Requirements: 1.1, 1.2, 2.2, 2.3, 3.2, 3.4_
