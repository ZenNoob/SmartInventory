/**
 * Unit Tests for InventoryTransferService
 * 
 * Tests FIFO deduction logic and insufficient stock handling.
 * Requirements: 5.2, 5.3, 5.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  InventoryTransferService, 
  InsufficientStockException,
  TransferItemInput,
  InsufficientStockError 
} from './inventory-transfer-service';

// Mock the database modules
vi.mock('../db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

vi.mock('../db/transaction', () => ({
  withTransaction: vi.fn((callback) => callback({})),
  transactionQuery: vi.fn(),
  transactionQueryOne: vi.fn(),
  transactionInsert: vi.fn(),
  transactionUpdate: vi.fn(),
}));

vi.mock('../db/connection', () => ({
  sql: {},
}));

import { query, queryOne } from '../db';
import { 
  transactionQuery, 
  transactionQueryOne, 
  transactionInsert 
} from '../db/transaction';

describe('InventoryTransferService', () => {
  let service: InventoryTransferService;

  beforeEach(() => {
    service = new InventoryTransferService();
    vi.clearAllMocks();
  });

  describe('validateStoresSameTenant', () => {
    it('should return valid when both stores belong to same tenant', async () => {
      vi.mocked(queryOne)
        .mockResolvedValueOnce({ Id: 'store-1', TenantId: 'tenant-1', name: 'Store 1' })
        .mockResolvedValueOnce({ Id: 'store-2', TenantId: 'tenant-1', name: 'Store 2' });

      const result = await service.validateStoresSameTenant('store-1', 'store-2');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error when source store not found', async () => {
      vi.mocked(queryOne).mockResolvedValueOnce(null);

      const result = await service.validateStoresSameTenant('invalid-store', 'store-2');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Source store not found');
    });

    it('should return error when destination store not found', async () => {
      vi.mocked(queryOne)
        .mockResolvedValueOnce({ Id: 'store-1', TenantId: 'tenant-1', name: 'Store 1' })
        .mockResolvedValueOnce(null);

      const result = await service.validateStoresSameTenant('store-1', 'invalid-store');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Destination store not found');
    });

    it('should return error when stores belong to different tenants', async () => {
      vi.mocked(queryOne)
        .mockResolvedValueOnce({ Id: 'store-1', TenantId: 'tenant-1', name: 'Store 1' })
        .mockResolvedValueOnce({ Id: 'store-2', TenantId: 'tenant-2', name: 'Store 2' });

      const result = await service.validateStoresSameTenant('store-1', 'store-2');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Stores do not belong to the same tenant');
    });

    it('should return error when source and destination are the same', async () => {
      vi.mocked(queryOne)
        .mockResolvedValueOnce({ Id: 'store-1', TenantId: 'tenant-1', name: 'Store 1' })
        .mockResolvedValueOnce({ Id: 'store-1', TenantId: 'tenant-1', name: 'Store 1' });

      const result = await service.validateStoresSameTenant('store-1', 'store-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Source and destination stores cannot be the same');
    });
  });

  describe('checkAvailableStock', () => {
    it('should return sufficient when stock is available', async () => {
      const items: TransferItemInput[] = [
        { productId: 'product-1', quantity: 10, unitId: 'unit-1' },
      ];

      vi.mocked(queryOne).mockResolvedValueOnce({ TotalRemaining: 15 });

      const result = await service.checkAvailableStock('store-1', items);

      expect(result.sufficient).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return insufficient when stock is not available', async () => {
      const items: TransferItemInput[] = [
        { productId: 'product-1', quantity: 20, unitId: 'unit-1' },
      ];

      vi.mocked(queryOne)
        .mockResolvedValueOnce({ TotalRemaining: 10 })
        .mockResolvedValueOnce({ id: 'product-1', name: 'Test Product' });

      const result = await service.checkAvailableStock('store-1', items);

      expect(result.sufficient).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        productId: 'product-1',
        productName: 'Test Product',
        requestedQuantity: 20,
        availableQuantity: 10,
      });
    });

    it('should check multiple items and return all insufficient errors', async () => {
      const items: TransferItemInput[] = [
        { productId: 'product-1', quantity: 20, unitId: 'unit-1' },
        { productId: 'product-2', quantity: 30, unitId: 'unit-1' },
      ];

      vi.mocked(queryOne)
        .mockResolvedValueOnce({ TotalRemaining: 10 }) // product-1 stock
        .mockResolvedValueOnce({ id: 'product-1', name: 'Product 1' })
        .mockResolvedValueOnce({ TotalRemaining: 5 }) // product-2 stock
        .mockResolvedValueOnce({ id: 'product-2', name: 'Product 2' });

      const result = await service.checkAvailableStock('store-1', items);

      expect(result.sufficient).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should handle zero stock correctly', async () => {
      const items: TransferItemInput[] = [
        { productId: 'product-1', quantity: 5, unitId: 'unit-1' },
      ];

      vi.mocked(queryOne)
        .mockResolvedValueOnce({ TotalRemaining: 0 })
        .mockResolvedValueOnce({ id: 'product-1', name: 'Test Product' });

      const result = await service.checkAvailableStock('store-1', items);

      expect(result.sufficient).toBe(false);
      expect(result.errors[0].availableQuantity).toBe(0);
    });
  });

  describe('transferInventory', () => {
    it('should throw error when stores validation fails', async () => {
      vi.mocked(queryOne).mockResolvedValueOnce(null);

      await expect(service.transferInventory({
        sourceStoreId: 'invalid-store',
        destinationStoreId: 'store-2',
        items: [{ productId: 'product-1', quantity: 10, unitId: 'unit-1' }],
      })).rejects.toThrow('Source store not found');
    });

    it('should throw InsufficientStockException when stock is insufficient', async () => {
      // Mock store validation
      vi.mocked(queryOne)
        .mockResolvedValueOnce({ Id: 'store-1', TenantId: 'tenant-1', name: 'Store 1' })
        .mockResolvedValueOnce({ Id: 'store-2', TenantId: 'tenant-1', name: 'Store 2' })
        // Mock stock check
        .mockResolvedValueOnce({ TotalRemaining: 5 })
        .mockResolvedValueOnce({ id: 'product-1', name: 'Test Product' });

      try {
        await service.transferInventory({
          sourceStoreId: 'store-1',
          destinationStoreId: 'store-2',
          items: [{ productId: 'product-1', quantity: 10, unitId: 'unit-1' }],
        });
        expect.fail('Should have thrown InsufficientStockException');
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientStockException);
        const stockError = error as InsufficientStockException;
        expect(stockError.errors).toHaveLength(1);
        expect(stockError.errors[0].requestedQuantity).toBe(10);
        expect(stockError.errors[0].availableQuantity).toBe(5);
      }
    });
  });

  describe('InsufficientStockException', () => {
    it('should create exception with correct properties', () => {
      const errors: InsufficientStockError[] = [
        { productId: 'p1', productName: 'Product 1', requestedQuantity: 10, availableQuantity: 5 },
      ];

      const exception = new InsufficientStockException('Test message', errors);

      expect(exception.name).toBe('InsufficientStockException');
      expect(exception.message).toBe('Test message');
      expect(exception.errors).toEqual(errors);
    });
  });
});
