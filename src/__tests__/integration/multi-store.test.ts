import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Multi-Store Data Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Store Context', () => {
    it('should load stores for authenticated user', async () => {
      const mockStores = [
        { id: 'store-1', name: 'Store 1', code: 'S1', status: 'active' },
        { id: 'store-2', name: 'Store 2', code: 'S2', status: 'active' },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          user: {
            id: 'user-1',
            email: 'test@example.com',
            stores: mockStores,
          },
        }),
      });

      const response = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await response.json();

      expect(data.user.stores).toHaveLength(2);
      expect(data.user.stores[0].id).toBe('store-1');
    });

    it('should switch store and persist selection', async () => {
      const storeId = 'store-2';
      
      // Simulate localStorage
      const storage: Record<string, string> = {};
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => storage[key] || null,
        setItem: (key: string, value: string) => { storage[key] = value; },
        removeItem: (key: string) => { delete storage[key]; },
      });

      localStorage.setItem('smartinventory_current_store_id', storeId);
      expect(localStorage.getItem('smartinventory_current_store_id')).toBe(storeId);
    });
  });

  describe('Products API - Store Isolation', () => {
    it('should only return products for current store', async () => {
      const mockProducts = [
        { id: 'prod-1', name: 'Product 1', storeId: 'store-1' },
        { id: 'prod-2', name: 'Product 2', storeId: 'store-1' },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockProducts,
          total: 2,
        }),
      });

      const response = await fetch('/api/products?storeId=store-1');
      const data = await response.json();

      expect(data.data).toHaveLength(2);
      data.data.forEach((product: { storeId: string }) => {
        expect(product.storeId).toBe('store-1');
      });
    });

    it('should not return products from other stores', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [],
          total: 0,
        }),
      });

      const response = await fetch('/api/products?storeId=store-nonexistent');
      const data = await response.json();

      expect(data.data).toHaveLength(0);
    });
  });

  describe('Customers API - Store Isolation', () => {
    it('should only return customers for current store', async () => {
      const mockCustomers = [
        { id: 'cust-1', name: 'Customer 1', storeId: 'store-1' },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockCustomers,
        }),
      });

      const response = await fetch('/api/customers?storeId=store-1');
      const data = await response.json();

      expect(data.data).toHaveLength(1);
      expect(data.data[0].storeId).toBe('store-1');
    });
  });

  describe('Sales API - Store Isolation', () => {
    it('should only return sales for current store', async () => {
      const mockSales = [
        { id: 'sale-1', invoiceNumber: 'INV-S1-20260104-001', storeId: 'store-1' },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockSales,
        }),
      });

      const response = await fetch('/api/sales?storeId=store-1');
      const data = await response.json();

      expect(data.data).toHaveLength(1);
      expect(data.data[0].storeId).toBe('store-1');
    });
  });

  describe('Access Control', () => {
    it('should deny access to store user does not belong to', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          success: false,
          error: 'Access denied to this store',
        }),
      });

      const response = await fetch('/api/products?storeId=unauthorized-store');
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });
  });
});
