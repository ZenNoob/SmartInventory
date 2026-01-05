# Project Blueprint: Smart Inventory

Đây là tài liệu tổng quan về kiến trúc và cấu trúc của dự án Smart Inventory. Mục tiêu là cung cấp một cái nhìn chi tiết để giúp các nhà phát triển dễ dàng hiểu, bảo trì và mở rộng hệ thống.

## 1. Tổng quan & Công nghệ

Ứng dụng này là một hệ thống quản lý bán hàng và kho hàng thông minh, được xây dựng trên một ngăn xếp công nghệ hiện đại:

- **Framework:** [Next.js](https://nextjs.org/) (sử dụng App Router)
- **UI:** [React](https://react.dev/), [ShadCN/UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database:** [Firebase](https://firebase.google.com/) (Firestore, Authentication)
- **Chức năng AI:** [Genkit](https://firebase.google.com/docs/genkit) (một framework của Google cho các ứng dụng AI)
- **Ngôn ngữ:** [TypeScript](https://www.typescriptlang.org/)

## 2. Cấu trúc thư mục

Dưới đây là phân tích cấu trúc thư mục chính của dự án:

```
.
├── src/
│   ├── app/                # Các trang và tuyến đường của Next.js
│   │   ├── (auth)/         # Layout và trang cho việc xác thực
│   │   ├── api/            # API routes (nếu có)
│   │   ├── categories/     # Trang quản lý danh mục
│   │   ├── customers/      # Trang quản lý khách hàng
│   │   ├── dashboard/      # Bảng điều khiển chính
│   │   ├── products/       # Trang quản lý sản phẩm
│   │   ├── reports/        # Các trang báo cáo (công nợ, doanh thu)
│   │   ├── sales/          # Trang quản lý bán hàng
│   │   ├── settings/       # Trang cài đặt
│   │   ├── units/          # Trang quản lý đơn vị tính
│   │   ├── users/          # Trang quản lý người dùng
│   │   ├── layout.tsx      # Layout gốc của ứng dụng
│   │   └── page.tsx        # Trang chủ (chuyển hướng đến dashboard)
│   │
│   ├── ai/                 # Cấu hình và các luồng (flow) của Genkit
│   │   ├── flows/          # Các flow AI cụ thể (ví dụ: dự đoán rủi ro)
│   │   └── genkit.ts       # Khởi tạo và cấu hình Genkit
│   │
│   ├── components/         # Các component React tái sử dụng
│   │   ├── ui/             # Các component từ thư viện ShadCN/UI
│   │   ├── header.tsx      # Header chung của trang
│   │   ├── main-nav.tsx    # Thanh điều hướng chính bên trái (sidebar)
│   │   └── user-nav.tsx    # Menu người dùng (avatar, dropdown)
│   │
│   ├── firebase/           # Cấu hình và các hook liên quan đến Firebase
│   │   ├── auth/           # Các hook xác thực (useUser)
│   │   ├── firestore/      # Các hook truy vấn Firestore (useDoc, useCollection)
│   │   ├── client-provider.tsx # Provider để khởi tạo Firebase ở phía client
│   │   ├── config.ts       # Cấu hình Firebase của dự án
│   │   └── provider.tsx    # Context Provider chính của Firebase
│   │
│   ├── hooks/              # Các custom hook của React
│   │   ├── use-toast.ts    # Hook để hiển thị thông báo (toast)
│   │   └── use-user-role.ts# Hook để lấy vai trò của người dùng hiện tại
│   │
│   └── lib/                # Thư viện, các hàm tiện ích và định nghĩa kiểu
│       ├── admin-actions.ts# Các hàm thực thi ở server với quyền admin
│       ├── types.ts        # Định nghĩa các kiểu dữ liệu (TypeScript types)
│       └── utils.ts        # Các hàm tiện ích chung (ví dụ: định dạng tiền tệ)
│
├── docs/                   # Tài liệu dự án
│   ├── backend.json        # Lược đồ cơ sở dữ liệu và các thực thể
│   └── BLUEPRINT.md        # Chính là tệp này
│
└── package.json            # Các gói phụ thuộc của dự án
```

## 3. Luồng dữ liệu & Logic

Hệ thống được thiết kế theo mô hình client-server-less, tận dụng sức mạnh của Next.js App Router và Firebase.

### 3.1. Frontend (Client-side)

- **Giao diện:** Các trang trong `src/app` là các Server Component theo mặc định, giúp tối ưu hiệu suất. Các component cần tương tác (ví dụ: form, button) được đánh dấu bằng `'use client'`.
- **Lấy dữ liệu (Read):**
    - Việc đọc dữ liệu từ Firestore chủ yếu được thực hiện bằng các custom hook `useCollection` và `useDoc` trong `src/firebase/firestore/`.
    - Các hook này lắng nghe sự thay đổi của dữ liệu trong thời gian thực và tự động cập nhật giao diện khi có thay đổi.
    - Để tránh các lần render không cần thiết, các query đến Firebase được memoized bằng `useMemoFirebase`.
- **Ghi dữ liệu (Write):**
    - Các hành động ghi dữ liệu (thêm, sửa, xóa) được thực hiện thông qua **Next.js Server Actions**.
    - Mỗi trang chức năng (ví dụ: `products`) có một tệp `actions.ts` riêng, chứa các hàm bất đồng bộ.
    - Các component client (ví dụ: `product-form.tsx`) sẽ gọi các hàm Server Action này khi người dùng submit form.

### 3.2. Backend (Server-side)

- **Server Actions (`<feature>/actions.ts`):**
    - Đây là "cầu nối" an toàn giữa client và backend. Các hàm trong đây chạy hoàn toàn trên server.
    - Các action này gọi đến `getAdminServices()` trong `src/lib/admin-actions.ts` để có được một instance của Firebase Admin SDK.
    - Việc sử dụng Admin SDK đảm bảo các thao tác ghi dữ liệu có đủ quyền, bỏ qua các security rules (vốn chỉ áp dụng cho client). Điều này tạo ra một lớp bảo mật: chỉ có logic được định nghĩa trên server mới có quyền ghi dữ liệu.
- **Firebase Admin (`src/lib/admin-actions.ts`):**
    - Tệp này chịu trách nhiệm khởi tạo Firebase Admin SDK bằng service account được lưu trữ an toàn trong biến môi trường. Nó cung cấp các service `auth` và `firestore` với quyền admin.
- **AI với Genkit (`src/ai/`):**
    - Các chức năng AI được định nghĩa dưới dạng các "flow" trong `src/ai/flows/`.
    - Các Server Actions sẽ gọi các hàm flow này khi cần đến xử lý của AI (ví dụ: `getDebtRiskPrediction` trong `src/app/actions.ts` gọi đến flow `predictDebtRisk`).

### 3.3. Sơ đồ luồng dữ liệu (Ví dụ: Thêm một sản phẩm)

1.  **Người dùng** nhấn nút "Lưu" trên `ProductForm` (`src/app/products/components/product-form.tsx`).
2.  `ProductForm` gọi Server Action `upsertProduct(productData)` từ `src/app/products/actions.ts`.
3.  Hàm `upsertProduct` (chạy trên server) gọi `getAdminServices()` để lấy `firestore` với quyền admin.
4.  `upsertProduct` thực hiện thao tác ghi dữ liệu vào collection `products` trên Firestore.
5.  **Ở phía client**, hook `useCollection` trên trang `ProductsPage` (`src/app/products/page.tsx`) đang lắng nghe collection `products`.
6.  Ngay khi dữ liệu thay đổi ở bước 4, Firestore đẩy cập nhật về client.
7.  Hook `useCollection` nhận dữ liệu mới, cập nhật state của component `ProductsPage`, và giao diện được render lại để hiển thị sản phẩm mới.

## 4. Các Thành phần Chính

- **`src/app/layout.tsx`:** Layout gốc, chứa cấu trúc HTML, body, thêm font chữ và cung cấp `FirebaseClientProvider` và `SidebarProvider` cho toàn bộ ứng dụng.
- **`src/components/main-nav.tsx`:** Chịu trách nhiệm hiển thị thanh sidebar điều hướng, quản lý trạng thái mở/đóng và hiển thị các menu dựa trên vai trò người dùng.
- **`<feature>/page.tsx`:** Các trang chính, thường là Server Component, chịu trách nhiệm lấy dữ liệu ban đầu và hiển thị danh sách (table).
- **`<feature>/components/<name>-form.tsx`:** Các component Client Component chứa logic form (sử dụng `react-hook-form` và `zod`) để xử lý việc thêm/sửa dữ liệu.
- **`<feature>/actions.ts`:** Nơi tập trung các logic backend cho một chức năng cụ thể.
- **`src/lib/types.ts`:** "Nguồn chân lý" cho các cấu trúc dữ liệu. Mọi entity (Product, Customer, Sale,...) đều được định nghĩa ở đây.

## 5. Hướng dẫn Mở rộng

Giả sử bạn muốn thêm một chức năng mới, ví dụ "Quản lý Nhà cung cấp" (Suppliers). Bạn sẽ cần thực hiện các bước sau:

1.  **Định nghĩa Kiểu dữ liệu:** Thêm type `Supplier` vào `src/lib/types.ts`.
2.  **Cập nhật Lược đồ Backend:** Thêm entity `Supplier` vào `docs/backend.json`.
3.  **Tạo Trang mới:** Tạo thư mục `src/app/suppliers/`.
    -   Tạo `page.tsx` để hiển thị danh sách các nhà cung cấp. Trang này sẽ sử dụng hook `useCollection` để lấy dữ liệu từ collection `suppliers`.
    -   Tạo thư mục con `components/` và tệp `supplier-form.tsx` để tạo form thêm/sửa nhà cung cấp.
    -   Tạo tệp `actions.ts` bên trong `src/app/suppliers/` để chứa các Server Action `upsertSupplier` và `deleteSupplier`.
4.  **Cập nhật Điều hướng:** Thêm một `SidebarMenuItem` mới vào `src/components/main-nav.tsx` để người dùng có thể truy cập trang "Quản lý Nhà cung cấp".

Bằng cách tuân theo cấu trúc này, bạn có thể dễ dàng thêm các chức năng mới một cách nhất quán và có tổ chức.