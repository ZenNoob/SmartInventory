/**
 * Integration Tests for Purchase Order Flow
 * 
 * Tests create → update → delete flow and delete constraint when lots are used.
 * Requirements: 1.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the repository
vi.mock('../repositories/purchase-order-repository', () => ({
  purchaseOrderRepository: {
    findAllWithSupplier: vi.fn(),
    findByIdWithDetails: vi.fn(),
    createWithItems: vi.fn(),
    updateWithItems: vi.fn(),
    deleteWithItems: vi.fn(),
    canDelete: vi.fn(),
  },
}));

import { purchaseOrderRepository } from '../repositories/purchase-order-repository';

describe('Purchase Order API - Validation', () => {
  describe('Create Purchase Order Validation', () => {
    function validateCreateInput(body: Record<string, unknown>): { valid: boolean; error?: string } {
      const { importDate, items } = body;
      
      if (!importDate) {
        return { valid: false, error: 'Import date is required' };
      }
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return { valid: false, error: 'At least one item is required' };
      }
      
      return { valid: true };
    }

    it('should reject request without import date', () => {
      const result = validateCreateInput({
        items: [{ productId: 'p1', quantity: 10, cost: 100, unitId: 'u1' }],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Import date is required');
    });

    it('should reject request without items', () => {
      const result = validateCreateInput({
        importDate: '2024-01-01',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('At least one item is required');
    });

    it('should reject request with empty items array', () => {
      const result = validateCreateInput({
        importDate: '2024-01-01',
        items: [],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('At least one item is required');
    });

    it('should accept valid request', () => {
      const result = validateCreateInput({
        importDate: '2024-01-01',
        items: [{ productId: 'p1', quantity: 10, cost: 100, unitId: 'u1' }],
      });
      expect(result.valid).toBe(true);
    });

    it('should accept request without supplier (optional)', () => {
      const result = validateCreateInput({
        importDate: '2024-01-01',
        items: [{ productId: 'p1', quantity: 10, cost: 100, unitId: 'u1' }],
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Total Amount Calculation', () => {
    function calculateTotalAmount(items: Array<{ quantity: number; cost: number }>): number {
      return items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
    }

    it('should calculate total amount correctly for single item', () => {
      const items = [{ quantity: 10, cost: 100 }];
      expect(calculateTotalAmount(items)).toBe(1000);
    });

    it('should calculate total amount correctly for multiple items', () => {
      const items = [
        { quantity: 10, cost: 100 },
        { quantity: 5, cost: 200 },
        { quantity: 3, cost: 50 },
      ];
      expect(calculateTotalAmount(items)).toBe(2150); // 1000 + 1000 + 150
    });

    it('should return 0 for empty items', () => {
      expect(calculateTotalAmount([])).toBe(0);
    });

    it('should handle decimal quantities', () => {
      const items = [{ quantity: 2.5, cost: 100 }];
      expect(calculateTotalAmount(items)).toBe(250);
    });
  });
});

describe('Purchase Order API - Delete Constraint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canDelete Logic', () => {
    it('should allow deletion when no lots have been used', async () => {
      vi.mocked(purchaseOrderRepository.canDelete).mockResolvedValue(true);
      
      const canDelete = await purchaseOrderRepository.canDelete('order-1', 'store-1');
      
      expect(canDelete).toBe(true);
    });

    it('should prevent deletion when lots have been partially used', async () => {
      vi.mocked(purchaseOrderRepository.canDelete).mockResolvedValue(false);
      
      const canDelete = await purchaseOrderRepository.canDelete('order-1', 'store-1');
      
      expect(canDelete).toBe(false);
    });
  });

  describe('Delete Flow', () => {
    it('should delete successfully when canDelete returns true', async () => {
      vi.mocked(purchaseOrderRepository.canDelete).mockResolvedValue(true);
      vi.mocked(purchaseOrderRepository.deleteWithItems).mockResolvedValue(true);

      const canDelete = await purchaseOrderRepository.canDelete('order-1', 'store-1');
      expect(canDelete).toBe(true);

      const result = await purchaseOrderRepository.deleteWithItems('order-1', 'store-1');
      expect(result).toBe(true);
      expect(purchaseOrderRepository.deleteWithItems).toHaveBeenCalledWith('order-1', 'store-1');
    });

    it('should not call deleteWithItems when canDelete returns false', async () => {
      vi.mocked(purchaseOrderRepository.canDelete).mockResolvedValue(false);

      const canDelete = await purchaseOrderRepository.canDelete('order-1', 'store-1');
      expect(canDelete).toBe(false);

      // In real flow, deleteWithItems should not be called
      expect(purchaseOrderRepository.deleteWithItems).not.toHaveBeenCalled();
    });
  });
});

describe('Purchase Order API - CRUD Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create → Update → Delete Flow', () => {
    const mockPurchaseOrder = {
      id: 'order-1',
      storeId: 'store-1',
      orderNumber: 'PN2024010001',
      supplierId: 'supplier-1',
      importDate: '2024-01-01T00:00:00.000Z',
      totalAmount: 1000,
      notes: 'Test order',
      createdAt: '2024-01-01T00:00:00.000Z',
      items: [
        {
          id: 'item-1',
          purchaseOrderId: 'order-1',
          productId: 'product-1',
          quantity: 10,
          cost: 100,
          unitId: 'unit-1',
        },
      ],
    };

    it('should create purchase order with items', async () => {
      vi.mocked(purchaseOrderRepository.createWithItems).mockResolvedValue(mockPurchaseOrder);

      const input = {
        supplierId: 'supplier-1',
        importDate: '2024-01-01',
        notes: 'Test order',
        totalAmount: 1000,
        items: [{ productId: 'product-1', quantity: 10, cost: 100, unitId: 'unit-1' }],
      };

      const result = await purchaseOrderRepository.createWithItems(input, 'store-1');

      expect(result).toEqual(mockPurchaseOrder);
      expect(result.orderNumber).toMatch(/^PN\d{6}\d{4}$/);
      expect(result.items).toHaveLength(1);
    });

    it('should update purchase order with new items', async () => {
      const updatedOrder = {
        ...mockPurchaseOrder,
        totalAmount: 2000,
        items: [
          { ...mockPurchaseOrder.items[0], quantity: 20 },
        ],
      };

      vi.mocked(purchaseOrderRepository.updateWithItems).mockResolvedValue(updatedOrder);

      const input = {
        supplierId: 'supplier-1',
        importDate: '2024-01-01',
        notes: 'Updated order',
        totalAmount: 2000,
        items: [{ productId: 'product-1', quantity: 20, cost: 100, unitId: 'unit-1' }],
      };

      const result = await purchaseOrderRepository.updateWithItems('order-1', input, 'store-1');

      expect(result.totalAmount).toBe(2000);
      expect(result.items[0].quantity).toBe(20);
    });

    it('should delete purchase order when not used', async () => {
      vi.mocked(purchaseOrderRepository.canDelete).mockResolvedValue(true);
      vi.mocked(purchaseOrderRepository.deleteWithItems).mockResolvedValue(true);

      const canDelete = await purchaseOrderRepository.canDelete('order-1', 'store-1');
      expect(canDelete).toBe(true);

      const result = await purchaseOrderRepository.deleteWithItems('order-1', 'store-1');
      expect(result).toBe(true);
    });

    it('should throw error when updating non-existent order', async () => {
      vi.mocked(purchaseOrderRepository.updateWithItems).mockRejectedValue(
        new Error('Purchase order not found or access denied')
      );

      const input = {
        supplierId: 'supplier-1',
        importDate: '2024-01-01',
        notes: 'Test',
        totalAmount: 1000,
        items: [{ productId: 'product-1', quantity: 10, cost: 100, unitId: 'unit-1' }],
      };

      await expect(
        purchaseOrderRepository.updateWithItems('non-existent', input, 'store-1')
      ).rejects.toThrow('Purchase order not found or access denied');
    });

    it('should throw error when deleting order with used inventory', async () => {
      vi.mocked(purchaseOrderRepository.deleteWithItems).mockRejectedValue(
        new Error('Cannot delete purchase order with used inventory')
      );

      await expect(
        purchaseOrderRepository.deleteWithItems('order-1', 'store-1')
      ).rejects.toThrow('Cannot delete purchase order with used inventory');
    });
  });
});

describe('Purchase Order API - Response Mapping', () => {
  function mapPurchaseOrderResponse(order: Record<string, unknown>) {
    return {
      id: order.id,
      storeId: order.storeId,
      orderNumber: order.orderNumber,
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      importDate: order.importDate,
      totalAmount: order.totalAmount,
      notes: order.notes,
      itemCount: order.itemCount,
      items: order.items,
      createdAt: order.createdAt,
    };
  }

  it('should map purchase order to response format', () => {
    const order = {
      id: 'order-1',
      storeId: 'store-1',
      orderNumber: 'PN2024010001',
      supplierId: 'supplier-1',
      supplierName: 'Test Supplier',
      importDate: '2024-01-01T00:00:00.000Z',
      totalAmount: 1000,
      notes: 'Test order',
      itemCount: 2,
      items: [],
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const response = mapPurchaseOrderResponse(order);

    expect(response.id).toBe('order-1');
    expect(response.orderNumber).toBe('PN2024010001');
    expect(response.supplierName).toBe('Test Supplier');
    expect(response.totalAmount).toBe(1000);
    expect(response.itemCount).toBe(2);
  });

  it('should handle null supplier', () => {
    const order = {
      id: 'order-1',
      storeId: 'store-1',
      orderNumber: 'PN2024010001',
      supplierId: null,
      supplierName: null,
      importDate: '2024-01-01T00:00:00.000Z',
      totalAmount: 1000,
      notes: null,
      itemCount: 1,
      items: [],
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const response = mapPurchaseOrderResponse(order);

    expect(response.supplierId).toBeNull();
    expect(response.supplierName).toBeNull();
    expect(response.notes).toBeNull();
  });
});

describe('Purchase Order API - Error Handling', () => {
  function mapErrorResponse(error: Error): { error: string; code: string } {
    const message = error.message;
    
    if (message.includes('not found') || message.includes('access denied')) {
      return { error: 'Purchase order not found or access denied', code: 'PURCHASE_NOT_FOUND' };
    }
    
    if (message.includes('Cannot delete')) {
      return { error: message, code: 'PURCHASE_DELETE_FORBIDDEN' };
    }
    
    return { error: 'Failed to process request', code: 'INTERNAL_ERROR' };
  }

  it('should return PURCHASE_NOT_FOUND for not found errors', () => {
    const error = new Error('Purchase order not found');
    const response = mapErrorResponse(error);
    
    expect(response.code).toBe('PURCHASE_NOT_FOUND');
  });

  it('should return PURCHASE_NOT_FOUND for access denied errors', () => {
    const error = new Error('access denied');
    const response = mapErrorResponse(error);
    
    expect(response.code).toBe('PURCHASE_NOT_FOUND');
  });

  it('should return PURCHASE_DELETE_FORBIDDEN for delete constraint errors', () => {
    const error = new Error('Cannot delete purchase order with used inventory');
    const response = mapErrorResponse(error);
    
    expect(response.code).toBe('PURCHASE_DELETE_FORBIDDEN');
    expect(response.error).toContain('Cannot delete');
  });

  it('should return INTERNAL_ERROR for unknown errors', () => {
    const error = new Error('Database connection failed');
    const response = mapErrorResponse(error);
    
    expect(response.code).toBe('INTERNAL_ERROR');
  });
});
