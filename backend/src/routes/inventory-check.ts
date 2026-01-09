import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(storeContext);

interface InventoryCheckResult {
  productId: string;
  productName: string;
  unitName: string;
  totalPurchased: number;      // Tổng nhập
  totalSold: number;           // Tổng bán
  expectedStock: number;       // Tồn kho dự kiến (nhập - bán)
  actualStock: number;         // Tồn kho thực tế
  difference: number;          // Chênh lệch
  isBalanced: boolean;         // Có cân bằng không
  purchaseDetails: Array<{
    purchaseId: string;
    date: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  saleDetails: Array<{
    saleId: string;
    invoiceNumber: string;
    date: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

// GET /api/inventory-check - Kiểm tra tính toán tồn kho
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { productId } = req.query;

    let productFilter = '';
    const params: Record<string, unknown> = { storeId };
    
    if (productId) {
      productFilter = 'AND p.id = @productId';
      params.productId = productId;
    }

    // Lấy danh sách sản phẩm
    const products = await query(
      `SELECT p.id, p.name, u.name as unit_name
       FROM Products p
       LEFT JOIN Units u ON p.unit_id = u.id
       WHERE p.store_id = @storeId ${productFilter}`,
      params
    );

    const results: InventoryCheckResult[] = [];

    for (const product of products) {
      const pid = product.id as string;

      // Lấy chi tiết nhập hàng
      const purchaseItems = await query(
        `SELECT pi.purchase_id, pu.purchase_date, pi.quantity, pi.unit_price, pi.total_price
         FROM PurchaseItems pi
         JOIN Purchases pu ON pi.purchase_id = pu.id
         WHERE pi.product_id = @productId AND pu.store_id = @storeId
         ORDER BY pu.purchase_date ASC`,
        { productId: pid, storeId }
      );

      // Lấy chi tiết bán hàng
      const saleItems = await query(
        `SELECT si.sale_id, s.invoice_number, s.transaction_date, si.quantity, si.unit_price, si.total_price
         FROM SaleItems si
         JOIN Sales s ON si.sale_id = s.id
         WHERE si.product_id = @productId AND s.store_id = @storeId
         ORDER BY s.transaction_date ASC`,
        { productId: pid, storeId }
      );

      // Lấy tồn kho thực tế
      const inventory = await query(
        `SELECT current_stock FROM Inventory 
         WHERE product_id = @productId AND store_id = @storeId`,
        { productId: pid, storeId }
      );

      const totalPurchased = purchaseItems.reduce((sum: number, item: Record<string, unknown>) => 
        sum + (item.quantity as number), 0);
      const totalSold = saleItems.reduce((sum: number, item: Record<string, unknown>) => 
        sum + (item.quantity as number), 0);
      const expectedStock = totalPurchased - totalSold;
      const actualStock = (inventory[0] as { current_stock: number })?.current_stock || 0;
      const difference = actualStock - expectedStock;

      results.push({
        productId: pid,
        productName: product.name as string,
        unitName: product.unit_name as string || '',
        totalPurchased,
        totalSold,
        expectedStock,
        actualStock,
        difference,
        isBalanced: Math.abs(difference) < 0.01, // Cho phép sai số nhỏ do làm tròn
        purchaseDetails: purchaseItems.map((item: Record<string, unknown>) => ({
          purchaseId: item.purchase_id as string,
          date: item.purchase_date as string,
          quantity: item.quantity as number,
          unitPrice: item.unit_price as number,
          total: item.total_price as number,
        })),
        saleDetails: saleItems.map((item: Record<string, unknown>) => ({
          saleId: item.sale_id as string,
          invoiceNumber: item.invoice_number as string,
          date: item.transaction_date as string,
          quantity: item.quantity as number,
          unitPrice: item.unit_price as number,
          total: item.total_price as number,
        })),
      });
    }

    // Tổng kết
    const summary = {
      totalProducts: results.length,
      balancedProducts: results.filter(r => r.isBalanced).length,
      unbalancedProducts: results.filter(r => !r.isBalanced).length,
      totalPurchaseValue: results.reduce((sum, r) => 
        sum + r.purchaseDetails.reduce((s, d) => s + d.total, 0), 0),
      totalSaleValue: results.reduce((sum, r) => 
        sum + r.saleDetails.reduce((s, d) => s + d.total, 0), 0),
    };

    res.json({
      success: true,
      summary,
      products: results,
    });
  } catch (error) {
    console.error('Inventory check error:', error);
    res.status(500).json({ error: 'Failed to check inventory' });
  }
});

// GET /api/inventory-check/sales-calculation - Kiểm tra tính toán đơn bán hàng
router.get('/sales-calculation', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { saleId } = req.query;

    let saleFilter = '';
    const params: Record<string, unknown> = { storeId };
    
    if (saleId) {
      saleFilter = 'AND s.id = @saleId';
      params.saleId = saleId;
    }

    const sales = await query(
      `SELECT s.*, c.full_name as customer_name
       FROM Sales s
       LEFT JOIN Customers c ON s.customer_id = c.id
       WHERE s.store_id = @storeId ${saleFilter}
       ORDER BY s.transaction_date DESC`,
      params
    );

    const results = [];

    for (const sale of sales) {
      const sid = sale.id as string;

      // Lấy chi tiết sản phẩm
      const items = await query(
        `SELECT si.*, p.name as product_name
         FROM SaleItems si
         JOIN Products p ON si.product_id = p.id
         WHERE si.sale_id = @saleId`,
        { saleId: sid }
      );

      // Tính toán lại
      const calculatedTotalAmount = items.reduce((sum: number, item: Record<string, unknown>) => {
        const qty = item.quantity as number;
        const price = item.unit_price as number;
        return sum + (qty * price);
      }, 0);

      const storedTotalAmount = sale.total_amount as number;
      const storedFinalAmount = sale.final_amount as number;
      const storedDiscount = sale.discount as number || 0;
      const storedVat = sale.vat_amount as number || 0;
      const storedTierDiscount = sale.tier_discount_amount as number || 0;
      const storedPointsDiscount = sale.points_discount as number || 0;

      // Tính final amount dự kiến
      const expectedFinalAmount = calculatedTotalAmount - storedDiscount - storedTierDiscount - storedPointsDiscount + storedVat;

      // Kiểm tra tiền thối/nợ
      const customerPayment = sale.customer_payment as number || 0;
      const previousDebt = sale.previous_debt as number || 0;
      const totalPayable = storedFinalAmount + previousDebt;
      const expectedRemainingDebt = totalPayable - customerPayment;
      const storedRemainingDebt = sale.remaining_debt as number || 0;

      const isAmountCorrect = Math.abs(calculatedTotalAmount - storedTotalAmount) < 0.01;
      const isFinalCorrect = Math.abs(expectedFinalAmount - storedFinalAmount) < 0.01;
      const isDebtCorrect = Math.abs(expectedRemainingDebt - storedRemainingDebt) < 0.01;

      results.push({
        saleId: sid,
        invoiceNumber: sale.invoice_number,
        customerName: sale.customer_name || 'Khách lẻ',
        transactionDate: sale.transaction_date,
        items: items.map((item: Record<string, unknown>) => ({
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
          calculatedTotal: (item.quantity as number) * (item.unit_price as number),
          isCorrect: Math.abs((item.total_price as number) - (item.quantity as number) * (item.unit_price as number)) < 0.01,
        })),
        calculation: {
          storedTotalAmount,
          calculatedTotalAmount,
          isAmountCorrect,
          discount: storedDiscount,
          tierDiscount: storedTierDiscount,
          pointsDiscount: storedPointsDiscount,
          vatAmount: storedVat,
          storedFinalAmount,
          expectedFinalAmount,
          isFinalCorrect,
          previousDebt,
          customerPayment,
          totalPayable,
          storedRemainingDebt,
          expectedRemainingDebt,
          isDebtCorrect,
        },
        isAllCorrect: isAmountCorrect && isFinalCorrect && isDebtCorrect,
      });
    }

    const summary = {
      totalSales: results.length,
      correctSales: results.filter(r => r.isAllCorrect).length,
      incorrectSales: results.filter(r => !r.isAllCorrect).length,
    };

    res.json({
      success: true,
      summary,
      sales: results,
    });
  } catch (error) {
    console.error('Sales calculation check error:', error);
    res.status(500).json({ error: 'Failed to check sales calculation' });
  }
});

// GET /api/inventory-check/purchases-calculation - Kiểm tra tính toán đơn nhập hàng
router.get('/purchases-calculation', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { purchaseId } = req.query;

    let purchaseFilter = '';
    const params: Record<string, unknown> = { storeId };
    
    if (purchaseId) {
      purchaseFilter = 'AND p.id = @purchaseId';
      params.purchaseId = purchaseId;
    }

    const purchases = await query(
      `SELECT p.*, s.name as supplier_name
       FROM Purchases p
       LEFT JOIN Suppliers s ON p.supplier_id = s.id
       WHERE p.store_id = @storeId ${purchaseFilter}
       ORDER BY p.purchase_date DESC`,
      params
    );

    const results = [];

    for (const purchase of purchases) {
      const pid = purchase.id as string;

      // Lấy chi tiết sản phẩm
      const items = await query(
        `SELECT pi.*, pr.name as product_name
         FROM PurchaseItems pi
         JOIN Products pr ON pi.product_id = pr.id
         WHERE pi.purchase_id = @purchaseId`,
        { purchaseId: pid }
      );

      // Tính toán lại
      const calculatedTotalAmount = items.reduce((sum: number, item: Record<string, unknown>) => {
        const qty = item.quantity as number;
        const price = item.unit_price as number;
        return sum + (qty * price);
      }, 0);

      const storedTotalAmount = purchase.total_amount as number;
      const paidAmount = purchase.paid_amount as number || 0;
      const storedRemainingDebt = purchase.remaining_debt as number || 0;
      const expectedRemainingDebt = storedTotalAmount - paidAmount;

      const isAmountCorrect = Math.abs(calculatedTotalAmount - storedTotalAmount) < 0.01;
      const isDebtCorrect = Math.abs(expectedRemainingDebt - storedRemainingDebt) < 0.01;

      results.push({
        purchaseId: pid,
        supplierName: purchase.supplier_name || 'Không xác định',
        purchaseDate: purchase.purchase_date,
        items: items.map((item: Record<string, unknown>) => ({
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
          calculatedTotal: (item.quantity as number) * (item.unit_price as number),
          isCorrect: Math.abs((item.total_price as number) - (item.quantity as number) * (item.unit_price as number)) < 0.01,
        })),
        calculation: {
          storedTotalAmount,
          calculatedTotalAmount,
          isAmountCorrect,
          paidAmount,
          storedRemainingDebt,
          expectedRemainingDebt,
          isDebtCorrect,
        },
        isAllCorrect: isAmountCorrect && isDebtCorrect,
      });
    }

    const summary = {
      totalPurchases: results.length,
      correctPurchases: results.filter(r => r.isAllCorrect).length,
      incorrectPurchases: results.filter(r => !r.isAllCorrect).length,
    };

    res.json({
      success: true,
      summary,
      purchases: results,
    });
  } catch (error) {
    console.error('Purchases calculation check error:', error);
    res.status(500).json({ error: 'Failed to check purchases calculation' });
  }
});

export default router;
