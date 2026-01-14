# Design Document

## Overview

Thiết kế này loại bỏ ràng buộc bắt buộc phải chọn ít nhất một quyền cho mỗi module trong phần phân quyền chi tiết. Người dùng có thể bỏ chọn tất cả các quyền cho một module, và hệ thống sẽ xử lý đúng việc kiểm tra quyền truy cập.

## Architecture

### Affected Components

1. **User Form Component** (`user-form.tsx`)
   - Form validation schema
   - Permission checkboxes handling
   - Submit logic

2. **Permission Checker** (`permissions.ts`)
   - Logic kiểm tra quyền truy cập
   - Xử lý trường hợp module không có quyền

3. **Backend API** (nếu cần)
   - Validation khi lưu permissions
   - Xử lý permissions object

## Components and Interfaces

### 1. User Form Component

**Current Behavior:**
- Form có thể yêu cầu ít nhất một quyền được chọn (nếu có validation)
- Khi submit, tất cả modules đều được lưu vào permissions object

**New Behavior:**
- Không có validation yêu cầu chọn quyền
- Khi submit, chỉ lưu các modules có ít nhất một quyền được chọn
- Modules không có quyền nào sẽ không được thêm vào permissions object (hoặc có mảng rỗng)

**Changes:**
```typescript
// Trong permissionsFormSchema, không cần thêm validation bắt buộc
const permissionsFormSchema = z.object({
  permissions: z.record(z.array(z.enum(['view', 'add', 'edit', 'delete'])))
})

// Khi submit, filter ra các modules không có quyền
const onPermissionsSubmit = async (data: z.infer<typeof permissionsFormSchema>) => {
  // Filter out modules with empty permissions array
  const filteredPermissions = Object.entries(data.permissions)
    .filter(([_, perms]) => perms && perms.length > 0)
    .reduce((acc, [module, perms]) => ({ ...acc, [module]: perms }), {});
  
  const result = await upsertUser({ 
    id: user?.id, 
    permissions: filteredPermissions 
  });
  // ... rest of the code
}
```

### 2. Permission Checker

**Current Behavior:**
- Kiểm tra xem module có trong permissions object không
- Kiểm tra xem permission có trong mảng không

**New Behavior:**
- Xử lý đúng cả trường hợp module không tồn tại trong permissions object
- Trả về false nếu module không có trong permissions hoặc có mảng rỗng

**Changes:**
```typescript
const hasPermission = (module: Module, permission: Permission): boolean => {
  if (!permissions) return false;
  const modulePermissions = permissions[module];
  // Return false if module doesn't exist or has empty array
  if (!modulePermissions || modulePermissions.length === 0) return false;
  return modulePermissions.includes(permission);
};
```

### 3. Clear All Permissions Button

**Current Behavior:**
- Đặt permissions object thành rỗng `{}`

**New Behavior:**
- Giữ nguyên logic hiện tại, vì `{}` đã đại diện cho việc không có quyền nào

**No changes needed** - Logic hiện tại đã đúng.

## Data Models

### Permissions Object

**Before:**
```typescript
{
  "dashboard": ["view"],
  "pos": ["view", "add"],
  "products": ["view", "add", "edit", "delete"]
}
```

**After (with some modules having no permissions):**
```typescript
{
  "dashboard": ["view"],
  "pos": ["view", "add"]
  // products module is not included because no permissions selected
}
```

Hoặc có thể giữ module với mảng rỗng:
```typescript
{
  "dashboard": ["view"],
  "pos": ["view", "add"],
  "products": []
}
```

**Recommendation:** Không lưu modules với mảng rỗng để giảm kích thước dữ liệu và đơn giản hóa logic.

## Error Handling

### Validation

- **Remove:** Validation yêu cầu ít nhất một quyền cho mỗi module
- **Keep:** Validation đảm bảo permissions object có cấu trúc đúng

### Permission Checks

- Khi kiểm tra quyền, nếu module không tồn tại trong permissions object, trả về `false`
- Khi kiểm tra quyền, nếu module có mảng rỗng, trả về `false`

## Testing Strategy

### Unit Tests

1. **Permission Checker Tests**
   - Test `hasPermission()` với module không tồn tại trong permissions
   - Test `hasPermission()` với module có mảng quyền rỗng
   - Test `canView()`, `canAdd()`, `canEdit()`, `canDelete()` với các trường hợp trên

2. **User Form Tests**
   - Test submit form với một module không có quyền nào
   - Test submit form với tất cả modules không có quyền nào
   - Test nút "Bỏ chọn tất cả" hoạt động đúng

### Integration Tests

1. **User Management Flow**
   - Tạo user với một số modules không có quyền
   - Verify user không thể truy cập các modules đó
   - Verify user có thể truy cập các modules có quyền

2. **Route Protection**
   - Test route guard với user không có quyền cho module
   - Test navigation menu ẩn các modules không có quyền

### Manual Testing

1. Mở form phân quyền chi tiết
2. Bỏ chọn tất cả quyền cho một module
3. Lưu và verify không có lỗi
4. Đăng nhập với user đó và verify không thể truy cập module
5. Test nút "Bỏ chọn tất cả" và "Mặc định"

## Implementation Notes

- Thay đổi này chủ yếu ở frontend (user-form.tsx và permissions.ts)
- Backend API có thể cần kiểm tra để đảm bảo không có validation bắt buộc
- Cần test kỹ permission checker để đảm bảo không có lỗi khi module không tồn tại
- UI/UX không thay đổi, chỉ loại bỏ ràng buộc validation
