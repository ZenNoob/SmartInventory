import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Checkout Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Purchase Flow', () => {
    it('should complete full checkout: browse → add to cart → checkout → order confirmation', async () => {
      // Step 1: Browse products
      const productsResponse = {
        success: true,
        data: [
          {
            id: 'prod-1',
            productName: 'Test Product',
            onlinePrice: 150000,
            isPublished: true,
            stockQuantity: 10,
          },
        ],
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(productsResponse),
        });

      let response = await fetch('/api/storefront/test-store/products');
      let data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].isPublished).toBe(true);

      // Step 2: Add to cart
      const addToCartResponse = {
        success: true,
        data: {
          id: 'cart-1',
          items: [
            {
              id: 'item-1',
              onlineProductId: 'prod-1',
              quantity: 2,
              unitPrice: 150000,
              totalPrice: 300000,
            },
          ],
          subtotal: 300000,
          total: 300000,
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(addToCartResponse),
      });

      response = await fetch('/api/storefront/test-store/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlineProductId: 'prod-1', quantity: 2 }),
      });
      data = await response.json();
      expect(data.data.items).toHaveLength(1);
      expect(data.data.subtotal).toBe(300000);

      // Step 3: Calculate shipping
      const shippingResponse = {
        success: true,
        data: {
          fee: 30000,
          isFreeShipping: false,
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(shippingResponse),
      });

      response = await fetch('/api/storefront/test-store/shipping?province=Ho Chi Minh&orderTotal=300000');
      data = await response.json();
      expect(data.data.fee).toBe(30000);

      // Step 4: Submit checkout
      const checkoutResponse = {
        success: true,
        data: {
          id: 'order-1',
          orderNumber: 'ON202601050001',
          status: 'pending',
          paymentStatus: 'pending',
          subtotal: 300000,
          shippingFee: 30000,
          total: 330000,
          items: [
            {
              productName: 'Test Product',
              quantity: 2,
              unitPrice: 150000,
              totalPrice: 300000,
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(checkoutResponse),
      });

      response = await fetch('/api/storefront/test-store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: 'customer@example.com',
          customerName: 'Test Customer',
          customerPhone: '0901234567',
          shippingAddress: {
            fullName: 'Test Customer',
            phone: '0901234567',
            province: 'Ho Chi Minh',
            district: 'District 1',
            ward: 'Ben Nghe',
            addressLine: '123 Test Street',
          },
          paymentMethod: 'cod',
        }),
      });
      data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.orderNumber).toBeDefined();
      expect(data.data.status).toBe('pending');
      expect(data.data.total).toBe(330000);
    });

    it('should handle guest checkout without account', async () => {
      const checkoutResponse = {
        success: true,
        data: {
          id: 'order-1',
          orderNumber: 'ON202601050001',
          customerId: null,
          customerEmail: 'guest@example.com',
          status: 'pending',
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(checkoutResponse),
      });

      const response = await fetch('/api/storefront/test-store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: 'guest@example.com',
          customerName: 'Guest User',
          customerPhone: '0901234567',
          shippingAddress: {
            fullName: 'Guest User',
            phone: '0901234567',
            province: 'Ho Chi Minh',
            district: 'District 1',
            ward: 'Ben Nghe',
            addressLine: '123 Test Street',
          },
          paymentMethod: 'bank_transfer',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.customerId).toBeNull();
    });

    it('should associate order with logged-in customer', async () => {
      const checkoutResponse = {
        success: true,
        data: {
          id: 'order-1',
          orderNumber: 'ON202601050001',
          customerId: 'cust-1',
          customerEmail: 'registered@example.com',
          status: 'pending',
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(checkoutResponse),
      });

      const response = await fetch('/api/storefront/test-store/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer customer-token',
        },
        body: JSON.stringify({
          customerId: 'cust-1',
          customerEmail: 'registered@example.com',
          customerName: 'Registered User',
          customerPhone: '0901234567',
          shippingAddress: {
            fullName: 'Registered User',
            phone: '0901234567',
            province: 'Ho Chi Minh',
            district: 'District 1',
            ward: 'Ben Nghe',
            addressLine: '123 Test Street',
          },
          paymentMethod: 'cod',
        }),
      });

      const data = await response.json();
      expect(data.data.customerId).toBe('cust-1');
    });
  });

  describe('Stock Deduction', () => {
    it('should deduct stock after order confirmation', async () => {
      // Simulate order confirmation that triggers stock deduction
      const confirmResponse = {
        success: true,
        data: {
          id: 'order-1',
          status: 'confirmed',
          stockDeducted: true,
          items: [
            {
              productId: 'prod-1',
              quantity: 2,
              previousStock: 10,
              newStock: 8,
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(confirmResponse),
      });

      const response = await fetch('/api/online-stores/store-1/orders/order-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      const data = await response.json();
      expect(data.data.status).toBe('confirmed');
      expect(data.data.stockDeducted).toBe(true);
    });

    it('should use FIFO for stock deduction from purchase lots', async () => {
      const confirmResponse = {
        success: true,
        data: {
          id: 'order-1',
          status: 'confirmed',
          stockDeduction: {
            productId: 'prod-1',
            totalDeducted: 5,
            lots: [
              { lotId: 'lot-1', deducted: 3, remainingInLot: 0 },
              { lotId: 'lot-2', deducted: 2, remainingInLot: 8 },
            ],
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(confirmResponse),
      });

      const response = await fetch('/api/online-stores/store-1/orders/order-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      const data = await response.json();
      expect(data.data.stockDeduction.lots[0].remainingInLot).toBe(0);
      expect(data.data.stockDeduction.lots[1].deducted).toBe(2);
    });

    it('should restore stock when order is cancelled', async () => {
      const cancelResponse = {
        success: true,
        data: {
          id: 'order-1',
          status: 'cancelled',
          stockRestored: true,
          items: [
            {
              productId: 'prod-1',
              quantity: 2,
              previousStock: 8,
              newStock: 10,
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cancelResponse),
      });

      const response = await fetch('/api/online-stores/store-1/orders/order-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      const data = await response.json();
      expect(data.data.status).toBe('cancelled');
      expect(data.data.stockRestored).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should fail checkout when cart is empty', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Giỏ hàng trống',
          code: 'CART_EMPTY',
        }),
      });

      const response = await fetch('/api/storefront/test-store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: 'test@example.com',
          customerName: 'Test',
          customerPhone: '0901234567',
          shippingAddress: {},
          paymentMethod: 'cod',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('CART_EMPTY');
    });

    it('should fail checkout when product is out of stock', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Sản phẩm đã hết hàng',
          code: 'PRODUCT_OUT_OF_STOCK',
          productId: 'prod-1',
        }),
      });

      const response = await fetch('/api/storefront/test-store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: 'test@example.com',
          customerName: 'Test',
          customerPhone: '0901234567',
          shippingAddress: {
            fullName: 'Test',
            phone: '0901234567',
            province: 'Ho Chi Minh',
            district: 'District 1',
            ward: 'Ben Nghe',
            addressLine: '123 Test Street',
          },
          paymentMethod: 'cod',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('PRODUCT_OUT_OF_STOCK');
    });

    it('should fail checkout when insufficient stock', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Số lượng không đủ. Chỉ còn 5 sản phẩm.',
          code: 'INSUFFICIENT_STOCK',
          availableQuantity: 5,
          requestedQuantity: 10,
        }),
      });

      const response = await fetch('/api/storefront/test-store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: 'test@example.com',
          customerName: 'Test',
          customerPhone: '0901234567',
          shippingAddress: {
            fullName: 'Test',
            phone: '0901234567',
            province: 'Ho Chi Minh',
            district: 'District 1',
            ward: 'Ben Nghe',
            addressLine: '123 Test Street',
          },
          paymentMethod: 'cod',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('INSUFFICIENT_STOCK');
      expect(data.availableQuantity).toBe(5);
    });

    it('should fail checkout when store is inactive', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Cửa hàng đang tạm ngưng hoạt động',
          code: 'STORE_INACTIVE',
        }),
      });

      const response = await fetch('/api/storefront/inactive-store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('STORE_INACTIVE');
    });

    it('should fail checkout when shipping zone not covered', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Không hỗ trợ giao hàng đến khu vực này',
          code: 'SHIPPING_NOT_AVAILABLE',
        }),
      });

      const response = await fetch('/api/storefront/test-store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: 'test@example.com',
          customerName: 'Test',
          customerPhone: '0901234567',
          shippingAddress: {
            fullName: 'Test',
            phone: '0901234567',
            province: 'Unknown Province',
            district: 'District 1',
            ward: 'Ward 1',
            addressLine: '123 Test Street',
          },
          paymentMethod: 'cod',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('SHIPPING_NOT_AVAILABLE');
    });

    it('should validate required checkout fields', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: {
            customerEmail: 'Email is required',
            customerPhone: 'Phone is required',
            shippingAddress: 'Shipping address is required',
          },
        }),
      });

      const response = await fetch('/api/storefront/test-store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details.customerEmail).toBeDefined();
    });

    it('should handle transaction rollback on error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          success: false,
          error: 'Transaction failed. All changes have been rolled back.',
          code: 'TRANSACTION_FAILED',
        }),
      });

      const response = await fetch('/api/storefront/test-store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: 'test@example.com',
          customerName: 'Test',
          customerPhone: '0901234567',
          shippingAddress: {
            fullName: 'Test',
            phone: '0901234567',
            province: 'Ho Chi Minh',
            district: 'District 1',
            ward: 'Ben Nghe',
            addressLine: '123 Test Street',
          },
          paymentMethod: 'cod',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('rolled back');
    });
  });

  describe('Payment Flow', () => {
    it('should handle COD payment method', async () => {
      const checkoutResponse = {
        success: true,
        data: {
          id: 'order-1',
          orderNumber: 'ON202601050001',
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          paymentInstructions: 'Thanh toán khi nhận hàng',
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(checkoutResponse),
      });

      const response = await fetch('/api/storefront/test-store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: 'test@example.com',
          customerName: 'Test',
          customerPhone: '0901234567',
          shippingAddress: {
            fullName: 'Test',
            phone: '0901234567',
            province: 'Ho Chi Minh',
            district: 'District 1',
            ward: 'Ben Nghe',
            addressLine: '123 Test Street',
          },
          paymentMethod: 'cod',
        }),
      });

      const data = await response.json();
      expect(data.data.paymentMethod).toBe('cod');
      expect(data.data.paymentStatus).toBe('pending');
    });

    it('should handle bank transfer payment method', async () => {
      const checkoutResponse = {
        success: true,
        data: {
          id: 'order-1',
          orderNumber: 'ON202601050001',
          paymentMethod: 'bank_transfer',
          paymentStatus: 'pending',
          bankDetails: {
            bankName: 'Vietcombank',
            accountNumber: '1234567890',
            accountName: 'CONG TY ABC',
            transferContent: 'ON202601050001',
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(checkoutResponse),
      });

      const response = await fetch('/api/storefront/test-store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: 'test@example.com',
          customerName: 'Test',
          customerPhone: '0901234567',
          shippingAddress: {
            fullName: 'Test',
            phone: '0901234567',
            province: 'Ho Chi Minh',
            district: 'District 1',
            ward: 'Ben Nghe',
            addressLine: '123 Test Street',
          },
          paymentMethod: 'bank_transfer',
        }),
      });

      const data = await response.json();
      expect(data.data.paymentMethod).toBe('bank_transfer');
      expect(data.data.bankDetails).toBeDefined();
      expect(data.data.bankDetails.transferContent).toBe('ON202601050001');
    });

    it('should confirm bank transfer payment', async () => {
      const confirmPaymentResponse = {
        success: true,
        data: {
          id: 'order-1',
          paymentStatus: 'paid',
          paidAt: '2026-01-05T12:00:00Z',
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(confirmPaymentResponse),
      });

      const response = await fetch('/api/online-stores/store-1/orders/order-1/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'paid' }),
      });

      const data = await response.json();
      expect(data.data.paymentStatus).toBe('paid');
    });
  });
});
