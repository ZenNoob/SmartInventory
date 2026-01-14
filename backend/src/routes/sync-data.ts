import { Router, Response } from 'express';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';
import { inventoryTransferService, InsufficientStockException } from '../services/inventory-transfer-service';
import { syncDataService } from '../services/sync-data-service';

const router = Router();

router.use(authenticate);
router.use(storeContext);

// POST /api/sync-data - Đồng bộ và tạo dữ liệu mẫu
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const results = await syncDataService.syncAllData(storeId);

    res.json({
      success: true,
      message: 'Đồng bộ dữ liệu thành công',
      results,
    });
  } catch (error) {
    console.error('Sync data error:', error);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

// POST /api/sync-data/inventory-transfer - Transfer inventory between stores
router.post('/inventory-transfer', async (req: AuthRequest, res: Response) => {
  try {
    const { sourceStoreId, destinationStoreId, items, notes } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    if (!sourceStoreId || !destinationStoreId) {
      return res.status(400).json({
        error: 'Source and destination store IDs are required',
        code: 'MISSING_STORE_IDS',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'At least one item is required for transfer',
        code: 'MISSING_ITEMS',
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0 || !item.unitId) {
        return res.status(400).json({
          error: 'Each item must have productId, quantity (> 0), and unitId',
          code: 'INVALID_ITEM',
        });
      }
    }

    // Validate stores belong to same tenant
    const validation = await inventoryTransferService.validateStoresSameTenant(
      sourceStoreId,
      destinationStoreId
    );

    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        code: 'STORES_NOT_SAME_TENANT',
      });
    }

    // Perform the transfer
    const result = await inventoryTransferService.transferInventory({
      sourceStoreId,
      destinationStoreId,
      items,
      notes,
      createdBy: userId,
    });

    res.json(result);
  } catch (error) {
    console.error('Inventory transfer error:', error);

    if (error instanceof InsufficientStockException) {
      return res.status(400).json({
        error: error.message,
        code: 'INSUFFICIENT_STOCK',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to transfer inventory';
    res.status(500).json({ error: errorMessage, code: 'TRANSFER_FAILED' });
  }
});

export default router;
