# Implementation Plan - Online Store Feature

- [x] 1. Database Schema Setup




  - [x] 1.1 Create OnlineStores table migration


    - Add table with all configuration fields (slug, theme, branding, contact)
    - Add foreign key to Stores table
    - Add unique constraint on slug
    - _Requirements: 1.1, 1.3, 2.1_
  - [x] 1.2 Create OnlineProducts and OnlineCategories tables

    - Add OnlineProducts with product reference and online-specific fields
    - Add OnlineCategories with hierarchical structure
    - Add indexes for performance
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 1.3 Create ShoppingCarts and CartItems tables
    - Add cart with session/customer reference
    - Add cart items with product and quantity
    - Add expiration handling

    - _Requirements: 4.1, 4.2_
  - [x] 1.4 Create OnlineOrders and OnlineOrderItems tables
    - Add order with status, payment, shipping fields
    - Add order items with product snapshot
    - Add indexes on status and date
    - _Requirements: 5.1, 5.4_

  - [x] 1.5 Create OnlineCustomers and CustomerAddresses tables
    - Add customer with authentication fields
    - Add addresses with default flag
    - Add unique constraint on email per store
    - _Requirements: 8.1, 8.3_

  - [x] 1.6 Create ShippingZones table
    - Add zones with province list and rates
    - Add free shipping threshold
    - _Requirements: 7.1, 7.3_

- [x] 2. Repository Layer





  - [x] 2.1 Implement OnlineStoreRepository


    - Create CRUD operations for online store config
    - Add findBySlug method for storefront routing
    - Add findByStoreId for admin management
    - _Requirements: 1.1, 1.2, 1.5_
  - [x] 2.2 Implement OnlineProductRepository


    - Create CRUD with store scoping
    - Add findPublished for storefront display
    - Add sync method with inventory product
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 2.3 Implement ShoppingCartRepository

    - Create cart management methods
    - Add item add/update/remove operations
    - Add cart total calculation
    - Add cleanup for expired carts
    - _Requirements: 4.1, 4.2, 4.5_
  - [x] 2.4 Implement OnlineOrderRepository


    - Create order with items in transaction
    - Add status update methods
    - Add findByStore with filters
    - Add order number generation
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 2.5 Implement OnlineCustomerRepository


    - Create customer registration
    - Add authentication methods
    - Add address management
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 2.6 Implement ShippingZoneRepository

    - Create zone CRUD operations
    - Add shipping fee calculation by province
    - _Requirements: 7.1, 7.2_

- [x] 3. API Routes - Admin





  - [x] 3.1 Create /api/online-stores routes


    - GET - List all online stores for owner
    - POST - Create new online store
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Create /api/online-stores/[storeId] routes

    - GET - Get store config
    - PUT - Update store settings
    - DELETE - Deactivate store
    - _Requirements: 1.3, 1.5_
  - [x] 3.3 Create /api/online-stores/[storeId]/products routes


    - GET - List products with publish status
    - POST - Add product to online catalog
    - PUT - Update online product settings
    - DELETE - Remove from online catalog
    - _Requirements: 3.1, 3.2, 3.3_


  - [x] 3.4 Create /api/online-stores/[storeId]/orders routes

    - GET - List orders with filters
    - PUT - Update order status
    - _Requirements: 5.2, 5.3, 5.5_
  - [x] 3.5 Create /api/online-stores/[storeId]/shipping routes


    - GET/POST/PUT/DELETE - Shipping zone management
    - _Requirements: 7.1, 7.4_

- [x] 4. API Routes - Storefront





  - [x] 4.1 Create /api/storefront/[slug]/products routes


    - GET - List published products
    - GET /[productSlug] - Get product details
    - _Requirements: 3.1, 3.4_


  - [x] 4.2 Create /api/storefront/[slug]/cart routes

    - GET - Get current cart
    - POST - Add item to cart
    - PUT - Update item quantity
    - DELETE - Remove item from cart

    - _Requirements: 4.1, 4.2_
  - [x] 4.3 Create /api/storefront/[slug]/checkout routes

    - POST - Create order from cart
    - Validate stock availability
    - Calculate shipping fee
    - _Requirements: 4.3, 4.4, 4.5, 5.1_
  - [x] 4.4 Create /api/storefront/[slug]/auth routes


    - POST /register - Customer registration
    - POST /login - Customer login
    - POST /logout - Customer logout
    - _Requirements: 8.1, 8.5_
  - [x] 4.5 Create /api/storefront/[slug]/customer routes


    - GET /orders - Order history
    - GET/POST/PUT/DELETE /addresses - Address management
    - _Requirements: 8.2, 8.3_

- [x] 5. Admin UI Components





  - [x] 5.1 Create OnlineStoreList page


    - Display all online stores with status
    - Add create new store button
    - Show basic statistics per store
    - _Requirements: 1.2_


  - [x] 5.2 Create OnlineStoreSettings page
    - Form for store configuration
    - Theme selection with preview
    - Branding upload (logo, favicon)
    - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4_
  - [x] 5.3 Create OnlineProductManager page


    - List products with publish toggle
    - Bulk publish/unpublish actions
    - Online price override form
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 5.4 Create OnlineOrderDashboard page


    - Order list with status filters
    - Order detail view
    - Status update actions
    - _Requirements: 5.2, 5.3_

  - [x] 5.5 Create ShippingZoneManager page

    - Zone list with province mapping
    - Rate configuration form
    - _Requirements: 7.1, 7.3_

- [x] 6. Storefront UI





  - [x] 6.1 Create Storefront layout and theme system


    - Dynamic theme loading based on store config
    - Header with logo, navigation, cart icon
    - Footer with contact info
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 6.2 Create ProductCatalog page

    - Product grid with images and prices
    - Category filtering
    - Search functionality
    - _Requirements: 3.1, 3.4_

  - [x] 6.3 Create ProductDetail page

    - Product images gallery
    - Price and description
    - Add to cart button with quantity
    - _Requirements: 3.2, 4.1_

  - [x] 6.4 Create ShoppingCart page

    - Cart items list with quantity controls
    - Subtotal and total display
    - Proceed to checkout button
    - _Requirements: 4.1, 4.2_

  - [x] 6.5 Create Checkout page

    - Shipping address form
    - Payment method selection
    - Order summary
    - Place order button
    - _Requirements: 4.3, 4.4, 6.1, 7.2_


  - [x] 6.6 Create OrderConfirmation page
    - Order number and details
    - Payment instructions (for bank transfer)
    - _Requirements: 5.1, 6.2_

  - [x] 6.7 Create CustomerAccount pages

    - Login/Register forms
    - Order history list
    - Address management
    - _Requirements: 8.1, 8.2, 8.3, 8.4_


- [x] 7. Order Processing





  - [x] 7.1 Implement order creation with inventory deduction

    - Create order in transaction
    - Deduct stock from PurchaseLots (FIFO)
    - Handle insufficient stock
    - _Requirements: 5.5_
  - [x] 7.2 Implement order status workflow


    - Status transition validation
    - Timestamp updates for each status
    - _Requirements: 5.3_

  - [x] 7.3 Implement payment status handling

    - COD payment flow
    - Bank transfer confirmation
    - _Requirements: 6.1, 6.3_


- [x] 8. Notifications






  - [ ] 8.1 Implement email notifications
    - Order confirmation to customer
    - New order alert to store owner
    - Status update notifications
    - _Requirements: 5.1, 5.3_

- [x] 9. Testing






  - [x] 9.1 Write unit tests for repositories

    - Test CRUD operations
    - Test cart calculations
    - Test order creation

  - [x] 9.2 Write integration tests for checkout flow

    - Test complete purchase flow
    - Test stock deduction
    - Test error handling
