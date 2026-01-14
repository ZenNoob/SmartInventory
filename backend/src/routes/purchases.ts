import { Router, Response } from 'express';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';
import { purchaseOrderRepository, CreatePurchaseOrderInput } from '../repositories/purchase-order-repository';

const router = Router();

router.use(authenticate);
router.use(storeContext);

/**
 * GET /api/purchases
 * Lấy danh sách đơn nhập hàng với pagination và filter
 * Query params: page, pageSize, search, supplierId, dateFrom, dateTo
 * Requirements: 2.1, 2.2, 2.3
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    
    // Parse query params
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string | undefined;
    const supplierId = req.query.supplierId as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    const result = await purchaseOrderRepository.findAllWithSupplier(storeId, {
      page,
      pageSize,
      search,
      supplierId,
      dateFrom,
      dateTo,
    });

    res.json({
      data: result.data,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Failed to get purchases', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/purchases/:id
 * Lấy chi tiết đơn nhập hàng với items
 * Requirements: 2.4
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    const purchase = await purchaseOrderRepository.findByIdWithDetails(id, storeId);

    if (!purchase) {
      res.status(404).json({ error: 'Purchase order not found', code: 'PURCHASE_NOT_FOUND' });
      return;
    }

    res.json(purchase);
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({ error: 'Failed to get purchase', code: 'INTERNAL_ERROR' });
  }
});


/**
 * POST /api/purchases
 * Tạo đơn nhập hàng mới
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const userId = req.user?.id;
    const { supplierId, importDate, notes, items } = req.body;

    // Validate required fields
    if (!importDate) {
      res.status(400).json({ error: 'Import date is required', code: 'VALIDATION_ERROR' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'At least one item is required', code: 'VALIDATION_ERROR' });
      return;
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: { quantity: number; cost: number }) => {
      return sum + (item.quantity * item.cost);
    }, 0);

    const input: CreatePurchaseOrderInput = {
      supplierId,
      importDate,
      notes,
      totalAmount,
      createdBy: userId,
      items: items.map((item: { productId: string; quantity: number; cost: number; unitId: string }) => ({
        productId: item.productId,
        quantity: item.quantity,
        cost: item.cost,
        unitId: item.unitId,
      })),
    };

    const purchase = await purchaseOrderRepository.createWithItems(input, storeId);

    res.status(201).json(purchase);
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({ error: 'Failed to create purchase', code: 'INTERNAL_ERROR' });
  }
});

/**
 * PUT /api/purchases/:id
 * Cập nhật đơn nhập hàng với validation
 * Requirements: 3.1
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;
    const { supplierId, importDate, notes, items } = req.body;

    // Validate required fields
    if (!importDate) {
      res.status(400).json({ error: 'Import date is required', code: 'VALIDATION_ERROR' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'At least one item is required', code: 'VALIDATION_ERROR' });
      return;
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: { quantity: number; cost: number }) => {
      return sum + (item.quantity * item.cost);
    }, 0);

    const input = {
      supplierId,
      importDate,
      notes,
      totalAmount,
      items: items.map((item: { productId: string; quantity: number; cost: number; unitId: string }) => ({
        productId: item.productId,
        quantity: item.quantity,
        cost: item.cost,
        unitId: item.unitId,
      })),
    };

    const purchase = await purchaseOrderRepository.updateWithItems(id, input, storeId);

    res.json(purchase);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
      res.status(404).json({ error: 'Purchase order not found or access denied', code: 'PURCHASE_NOT_FOUND' });
      return;
    }

    console.error('Update purchase error:', error);
    res.status(500).json({ error: 'Failed to update purchase', code: 'INTERNAL_ERROR' });
  }
});

/**
 * DELETE /api/purchases/:id
 * Xóa đơn nhập hàng với kiểm tra ràng buộc
 * Requirements: 3.2, 3.3, 3.4
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    // Check if purchase order can be deleted (no used lots)
    const canDelete = await purchaseOrderRepository.canDelete(id, storeId);
    
    if (!canDelete) {
      res.status(400).json({ 
        error: 'Cannot delete purchase order with used inventory. Some items have been sold or transferred.',
        code: 'PURCHASE_DELETE_FORBIDDEN',
      });
      return;
    }

    await purchaseOrderRepository.deleteWithItems(id, storeId);

    res.json({ success: true, message: 'Purchase order deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
      res.status(404).json({ error: 'Purchase order not found or access denied', code: 'PURCHASE_NOT_FOUND' });
      return;
    }

    if (errorMessage.includes('Cannot delete')) {
      res.status(400).json({ error: errorMessage, code: 'PURCHASE_DELETE_FORBIDDEN' });
      return;
    }

    console.error('Delete purchase error:', error);
    res.status(500).json({ error: 'Failed to delete purchase', code: 'INTERNAL_ERROR' });
  }
});

export default router;
