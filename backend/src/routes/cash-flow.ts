import { Router, Response } from 'express';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';
import { cashTransactionRepository } from '../repositories/cash-transaction-repository';

const router = Router();

router.use(authenticate);
router.use(storeContext);

// GET /api/cash-flow
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { 
      page, 
      pageSize, 
      type, 
      category, 
      dateFrom, 
      dateTo, 
      orderBy, 
      orderDirection,
      includeSummary 
    } = req.query;

    const result = await cashTransactionRepository.findAllFiltered(storeId, {
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
      type: type as 'thu' | 'chi' | undefined,
      category: category as string | undefined,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
      orderBy: orderBy as string | undefined,
      orderDirection: orderDirection as 'ASC' | 'DESC' | undefined,
    });

    // Include summary if requested
    if (includeSummary === 'true') {
      const summary = await cashTransactionRepository.getSummary(
        storeId,
        dateFrom as string | undefined,
        dateTo as string | undefined
      );
      res.json({ ...result, summary });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Get cash flow error:', error);
    res.status(500).json({ error: 'Failed to get cash flow' });
  }
});

// GET /api/cash-flow/summary
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { dateFrom, dateTo } = req.query;

    const summary = await cashTransactionRepository.getSummary(
      storeId,
      dateFrom as string | undefined,
      dateTo as string | undefined
    );

    res.json(summary);
  } catch (error) {
    console.error('Get cash flow summary error:', error);
    res.status(500).json({ error: 'Failed to get cash flow summary' });
  }
});

// GET /api/cash-flow/categories
router.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const categories = await cashTransactionRepository.getCategories(storeId);
    res.json(categories);
  } catch (error) {
    console.error('Get cash flow categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// GET /api/cash-flow/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    const transaction = await cashTransactionRepository.findById(id, storeId);
    if (!transaction) {
      res.status(404).json({ error: 'Không tìm thấy giao dịch' });
      return;
    }

    res.json(transaction);
  } catch (error) {
    console.error('Get cash transaction error:', error);
    res.status(500).json({ error: 'Failed to get cash transaction' });
  }
});

// POST /api/cash-flow
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const userId = req.user!.id;
    const { type, transactionDate, amount, reason, category, relatedInvoiceId } = req.body;

    if (!type || !['thu', 'chi'].includes(type)) {
      res.status(400).json({ error: 'Loại giao dịch không hợp lệ (thu/chi)' });
      return;
    }

    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Số tiền phải lớn hơn 0' });
      return;
    }

    if (!reason) {
      res.status(400).json({ error: 'Lý do là bắt buộc' });
      return;
    }

    const transaction = await cashTransactionRepository.create(
      {
        storeId,
        type,
        transactionDate: transactionDate || new Date().toISOString(),
        amount,
        reason,
        category,
        relatedInvoiceId,
        createdBy: userId,
      },
      storeId
    );

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create cash transaction error:', error);
    res.status(500).json({ error: 'Failed to create cash transaction' });
  }
});

// PUT /api/cash-flow/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;
    const { type, transactionDate, amount, reason, category, relatedInvoiceId } = req.body;

    if (type && !['thu', 'chi'].includes(type)) {
      res.status(400).json({ error: 'Loại giao dịch không hợp lệ (thu/chi)' });
      return;
    }

    if (amount !== undefined && amount <= 0) {
      res.status(400).json({ error: 'Số tiền phải lớn hơn 0' });
      return;
    }

    const transaction = await cashTransactionRepository.update(
      id,
      { type, transactionDate, amount, reason, category, relatedInvoiceId },
      storeId
    );

    res.json(transaction);
  } catch (error) {
    console.error('Update cash transaction error:', error);
    if ((error as Error).message === 'Cash transaction not found') {
      res.status(404).json({ error: 'Không tìm thấy giao dịch' });
      return;
    }
    res.status(500).json({ error: 'Failed to update cash transaction' });
  }
});

// DELETE /api/cash-flow/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    const deleted = await cashTransactionRepository.delete(id, storeId);
    if (!deleted) {
      res.status(404).json({ error: 'Không tìm thấy giao dịch' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete cash transaction error:', error);
    res.status(500).json({ error: 'Failed to delete cash transaction' });
  }
});

export default router;
