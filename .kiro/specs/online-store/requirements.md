# Requirements Document

## Introduction

Tính năng Website Bán Hàng Online cho phép khách hàng (chủ cửa hàng) tạo và quản lý nhiều cửa hàng trực tuyến. Mỗi cửa hàng có thể có website riêng để bán hàng cho người tiêu dùng cuối. Hệ thống hỗ trợ quản lý sản phẩm, đơn hàng, thanh toán và giao hàng cho từng cửa hàng.

## Glossary

- **Store_Owner**: Người dùng sở hữu và quản lý một hoặc nhiều cửa hàng trong hệ thống
- **Online_Store**: Cửa hàng trực tuyến với website riêng để bán hàng cho khách hàng cuối
- **End_Customer**: Người mua hàng trên website của cửa hàng trực tuyến
- **Storefront**: Giao diện website công khai mà End_Customer sử dụng để mua hàng
- **Shopping_Cart**: Giỏ hàng chứa các sản phẩm End_Customer muốn mua
- **Online_Order**: Đơn hàng được tạo từ Storefront bởi End_Customer
- **Order_Status**: Trạng thái đơn hàng (pending, confirmed, processing, shipped, delivered, cancelled)
- **Payment_Method**: Phương thức thanh toán (COD, bank_transfer, e_wallet)
- **Shipping_Address**: Địa chỉ giao hàng của End_Customer

## Requirements

### Requirement 1: Multi-Store Management

**User Story:** As a Store_Owner, I want to create and manage multiple online stores, so that I can expand my business across different brands or locations.

#### Acceptance Criteria

1. WHEN Store_Owner requests to create a new Online_Store, THE System SHALL generate a unique subdomain for the store within 5 seconds.
2. WHILE Store_Owner is managing stores, THE System SHALL display all owned stores with their status and basic statistics.
3. THE System SHALL allow Store_Owner to configure store settings including name, logo, description, and contact information.
4. IF Store_Owner attempts to create more than 10 stores, THEN THE System SHALL display a notification requesting plan upgrade.
5. WHEN Store_Owner deactivates an Online_Store, THE System SHALL hide the Storefront from public access while preserving all data.

### Requirement 2: Storefront Configuration

**User Story:** As a Store_Owner, I want to customize my online store's appearance, so that it reflects my brand identity.

#### Acceptance Criteria

1. THE System SHALL provide at least 3 pre-built Storefront themes for Store_Owner to choose from.
2. WHEN Store_Owner selects a theme, THE System SHALL apply the theme to the Storefront within 10 seconds.
3. THE System SHALL allow Store_Owner to customize primary color, secondary color, and font family.
4. WHEN Store_Owner uploads a logo, THE System SHALL validate the image format (PNG, JPG, SVG) and size (max 2MB).
5. THE System SHALL display a live preview of Storefront changes before publishing.

### Requirement 3: Product Catalog for Online Store

**User Story:** As a Store_Owner, I want to select which products to display on my online store, so that I can control my online inventory separately.

#### Acceptance Criteria

1. THE System SHALL allow Store_Owner to select products from existing inventory to publish on Storefront.
2. WHEN Store_Owner publishes a product, THE System SHALL sync the product's price, description, and images to Storefront.
3. THE System SHALL allow Store_Owner to set different prices for online sales versus in-store sales.
4. WHILE product stock is zero, THE System SHALL display "Out of Stock" status on Storefront.
5. WHEN Store_Owner updates product information, THE System SHALL reflect changes on Storefront within 30 seconds.

### Requirement 4: Shopping Cart and Checkout

**User Story:** As an End_Customer, I want to add products to my cart and complete checkout, so that I can purchase items online.

#### Acceptance Criteria

1. WHEN End_Customer adds a product to Shopping_Cart, THE System SHALL update cart total and item count within 2 seconds.
2. THE System SHALL persist Shopping_Cart data for 7 days for returning End_Customers.
3. WHEN End_Customer proceeds to checkout, THE System SHALL require shipping address and contact information.
4. THE System SHALL validate all checkout form fields before allowing order submission.
5. IF product becomes unavailable during checkout, THEN THE System SHALL notify End_Customer and remove item from cart.

### Requirement 5: Order Management

**User Story:** As a Store_Owner, I want to manage online orders, so that I can fulfill customer purchases efficiently.

#### Acceptance Criteria

1. WHEN End_Customer submits an order, THE System SHALL create an Online_Order with status "pending" and notify Store_Owner.
2. THE System SHALL display all Online_Orders in a dashboard with filtering by status, date range, and customer.
3. WHEN Store_Owner updates Order_Status, THE System SHALL send notification to End_Customer via email.
4. THE System SHALL calculate order totals including subtotal, shipping fee, and applicable discounts.
5. WHEN Store_Owner confirms an order, THE System SHALL deduct product quantities from inventory.

### Requirement 6: Payment Processing

**User Story:** As an End_Customer, I want to choose my preferred payment method, so that I can pay conveniently.

#### Acceptance Criteria

1. THE System SHALL support at least 3 Payment_Methods: COD, bank transfer, and e-wallet integration.
2. WHEN End_Customer selects bank transfer, THE System SHALL display store's bank account details and order reference code.
3. WHEN Store_Owner confirms payment received, THE System SHALL update order payment status to "paid".
4. THE System SHALL generate payment receipt for each completed transaction.
5. IF payment fails or times out, THEN THE System SHALL retain the order with status "payment_pending" for 24 hours.

### Requirement 7: Shipping and Delivery

**User Story:** As a Store_Owner, I want to configure shipping options, so that customers can choose their preferred delivery method.

#### Acceptance Criteria

1. THE System SHALL allow Store_Owner to configure shipping zones and rates.
2. WHEN End_Customer enters Shipping_Address, THE System SHALL calculate applicable shipping fee based on zone.
3. THE System SHALL allow Store_Owner to set free shipping threshold amount.
4. WHEN Store_Owner marks order as shipped, THE System SHALL allow entry of tracking number and carrier information.
5. THE System SHALL display estimated delivery date based on shipping zone configuration.

### Requirement 8: Customer Account Management

**User Story:** As an End_Customer, I want to create an account, so that I can track my orders and save my information.

#### Acceptance Criteria

1. THE System SHALL allow End_Customer to register using email and password.
2. WHEN End_Customer logs in, THE System SHALL display order history and saved addresses.
3. THE System SHALL allow End_Customer to save multiple Shipping_Addresses.
4. WHEN End_Customer places an order while logged in, THE System SHALL associate the order with their account.
5. THE System SHALL allow guest checkout without requiring account creation.
