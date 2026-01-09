import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(storeContext);

// GET /api/reports/revenue
router.get('/revenue', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { from, to } = req.query;

    const result = await query(
      `SELECT 
        CAST(TransactionDate AS DATE) as Date,
        SUM(FinalAmount) as Revenue,
        COUNT(*) as OrderCount
       FROM Sales
       WHERE StoreId = @storeId
         AND TransactionDate >= @from
         AND TransactionDate <= @to
       GROUP BY CAST(TransactionDate AS DATE)
       ORDER BY Date`,
      { storeId, from, to }
    );

    res.json(result);
  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({ error: 'Failed to get revenue report' });
  }
});

// GET /api/reports/sales - Sales report with filters
router.get('/sales', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { dateFrom, dateTo } = req.query;

    const result = await query(
      `SELECT 
        s.id, s.transaction_date as transactionDate, s.final_amount as finalAmount,
        s.status, 
        c.full_name as customerName
       FROM Sales s
       LEFT JOIN Customers c ON s.customer_id = c.id
       WHERE s.store_id = @storeId
         AND (@dateFrom IS NULL OR s.transaction_date >= @dateFrom)
         AND (@dateTo IS NULL OR s.transaction_date <= DATEADD(day, 1, @dateTo))
       ORDER BY s.transaction_date DESC`,
      { storeId, dateFrom: dateFrom || null, dateTo: dateTo || null }
    );

    res.json({ data: result, total: result.length });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({ error: 'Failed to get sales report' });
  }
});

// GET /api/reports/inventory
router.get('/inventory', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;

    const result = await query(
      `SELECT 
        p.id, p.name, p.sku as barcode,
        c.name as categoryName,
        p.stock_quantity as currentStock,
        p.cost_price as averageCost,
        p.price as sellingPrice
       FROM Products p
       LEFT JOIN Categories c ON p.category_id = c.id
       WHERE p.store_id = @storeId
       ORDER BY p.name`,
      { storeId }
    );

    res.json({ data: result, total: result.length });
  } catch (error) {
    console.error('Get inventory report error:', error);
    res.status(500).json({ error: 'Failed to get inventory report' });
  }
});

// GET /api/reports/debt - Customer debt report
router.get('/debt', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { hasDebtOnly } = req.query;

    let whereClause = 'WHERE c.store_id = @storeId';
    if (hasDebtOnly === 'true') {
      whereClause += ' HAVING ISNULL(SUM(s.remaining_debt), 0) > 0';
    }

    const result = await query(
      `SELECT 
        c.id, c.full_name as name, c.phone, c.email,
        ISNULL(SUM(s.remaining_debt), 0) as totalDebt,
        COUNT(s.id) as transactionCount
       FROM Customers c
       LEFT JOIN Sales s ON c.id = s.customer_id
       ${whereClause}
       GROUP BY c.id, c.full_name, c.phone, c.email
       ORDER BY totalDebt DESC`,
      { storeId }
    );

    res.json({ data: result, total: result.length });
  } catch (error) {
    console.error('Get debt report error:', error);
    res.status(500).json({ error: 'Failed to get debt report' });
  }
});

// GET /api/reports/supplier-debt - Supplier debt report
router.get('/supplier-debt', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;

    const result = await query(
      `SELECT 
        s.id, s.name, s.phone, s.email,
        ISNULL(SUM(p.remaining_debt), 0) as totalDebt,
        COUNT(p.id) as purchaseCount
       FROM Suppliers s
       LEFT JOIN Purchases p ON s.id = p.supplier_id
       WHERE s.store_id = @storeId
       GROUP BY s.id, s.name, s.phone, s.email
       HAVING ISNULL(SUM(p.remaining_debt), 0) > 0
       ORDER BY totalDebt DESC`,
      { storeId }
    );

    res.json({ data: result, total: result.length });
  } catch (error) {
    console.error('Get supplier debt report error:', error);
    res.status(500).json({ error: 'Failed to get supplier debt report' });
  }
});

// GET /api/reports/profit - Profit report
router.get('/profit', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { dateFrom, dateTo } = req.query;

    // Get all products with their cost price and inventory
    const result = await query(
      `SELECT 
        p.id as productId, 
        p.name as productName,
        p.cost_price as costPrice,
        p.price as sellingPrice,
        ISNULL(i.current_stock, p.stock_quantity) as stockQuantity,
        ISNULL(i.average_cost, p.cost_price) as averageCost
       FROM Products p
       LEFT JOIN Inventory i ON p.id = i.product_id AND i.store_id = @storeId
       WHERE p.store_id = @storeId
       ORDER BY p.name`,
      { storeId }
    );

    // Transform data
    const data = result.map((item: Record<string, unknown>) => ({
      productId: item.productId,
      productName: item.productName,
      totalQuantity: 0,
      totalRevenue: 0,
      totalCost: 0,
      profit: 0,
      costPrice: item.costPrice || item.averageCost || 0,
      sellingPrice: item.sellingPrice || 0,
      stockQuantity: item.stockQuantity || 0,
    }));

    res.json({ 
      data, 
      total: data.length,
      totals: {
        totalQuantity: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        profitMargin: 0,
      }
    });
  } catch (error) {
    console.error('Get profit report error:', error);
    res.status(500).json({ error: 'Failed to get profit report' });
  }
});

// GET /api/reports/sold-products - Sold products report
router.get('/sold-products', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { from, to } = req.query;

    const result = await query(
      `SELECT 
        p.id, p.name, p.sku as barcode,
        c.name as categoryName,
        ISNULL(SUM(si.quantity), 0) as totalSold,
        ISNULL(SUM(si.subtotal), 0) as totalRevenue
       FROM Products p
       LEFT JOIN SaleItems si ON p.id = si.productId
       LEFT JOIN Sales s ON si.saleId = s.id
       LEFT JOIN Categories c ON p.category_id = c.id
       WHERE p.store_id = @storeId
         AND (s.id IS NULL OR (s.transaction_date >= @from AND s.transaction_date <= @to))
       GROUP BY p.id, p.name, p.sku, c.name
       ORDER BY totalSold DESC`,
      { storeId, from, to }
    );

    res.json(result);
  } catch (error) {
    console.error('Get sold products report error:', error);
    res.status(500).json({ error: 'Failed to get sold products report' });
  }
});

export default router;
