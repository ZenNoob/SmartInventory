import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(storeContext);

// GET /api/suppliers
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    
    // Get all suppliers
    const suppliers = await query(
      'SELECT * FROM Suppliers WHERE store_id = @storeId ORDER BY name',
      { storeId }
    );

    // Get purchase totals per supplier
    let purchaseTotals: Record<string, number> = {};
    try {
      const purchases = await query(
        `SELECT supplier_id, SUM(total_amount) as total
         FROM PurchaseOrders
         WHERE store_id = @storeId AND supplier_id IS NOT NULL
         GROUP BY supplier_id`,
        { storeId }
      );
      purchaseTotals = (purchases as Array<{ supplier_id: string; total: number }>).reduce((acc, p) => {
        acc[p.supplier_id] = Number(p.total) || 0;
        return acc;
      }, {} as Record<string, number>);
    } catch {
      // PurchaseOrders table may not exist
    }

    // Get payment totals per supplier
    let paymentTotals: Record<string, number> = {};
    try {
      const payments = await query(
        `SELECT supplier_id, SUM(amount) as total
         FROM SupplierPayments
         WHERE store_id = @storeId AND supplier_id IS NOT NULL
         GROUP BY supplier_id`,
        { storeId }
      );
      paymentTotals = (payments as Array<{ supplier_id: string; total: number }>).reduce((acc, p) => {
        acc[p.supplier_id] = Number(p.total) || 0;
        return acc;
      }, {} as Record<string, number>);
    } catch {
      // SupplierPayments table may not exist
    }

    res.json(suppliers.map((s: Record<string, unknown>) => {
      const supplierId = s.id as string;
      const totalPurchase = purchaseTotals[supplierId] || 0;
      const totalPaid = paymentTotals[supplierId] || 0;
      return {
        id: s.id,
        storeId: s.store_id,
        name: s.name,
        contactPerson: s.contact_person,
        email: s.email,
        phone: s.phone,
        address: s.address,
        taxCode: s.tax_code,
        notes: s.notes,
        totalPurchase,
        totalPaid,
        totalDebt: totalPurchase - totalPaid,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      };
    }));
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Failed to get suppliers' });
  }
});

// GET /api/suppliers/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    const s = await queryOne(
      'SELECT * FROM Suppliers WHERE id = @id AND store_id = @storeId',
      { id, storeId }
    );

    if (!s) {
      res.status(404).json({ error: 'Không tìm thấy nhà cung cấp' });
      return;
    }

    // Get purchase total for this supplier
    let totalPurchase = 0;
    try {
      const purchaseResult = await queryOne(
        `SELECT SUM(total_amount) as total FROM PurchaseOrders WHERE store_id = @storeId AND supplier_id = @id`,
        { storeId, id }
      );
      totalPurchase = Number(purchaseResult?.total) || 0;
    } catch {
      // PurchaseOrders table may not exist
    }

    // Get payment total for this supplier
    let totalPaid = 0;
    try {
      const paymentResult = await queryOne(
        `SELECT SUM(amount) as total FROM SupplierPayments WHERE store_id = @storeId AND supplier_id = @id`,
        { storeId, id }
      );
      totalPaid = Number(paymentResult?.total) || 0;
    } catch {
      // SupplierPayments table may not exist
    }

    res.json({
      id: s.id,
      storeId: s.store_id,
      name: s.name,
      contactPerson: s.contact_person,
      email: s.email,
      phone: s.phone,
      address: s.address,
      taxCode: s.tax_code,
      notes: s.notes,
      totalPurchase,
      totalPaid,
      totalDebt: totalPurchase - totalPaid,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ error: 'Failed to get supplier' });
  }
});

// POST /api/suppliers
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { name, contactPerson, email, phone, address, taxCode, notes } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Tên nhà cung cấp là bắt buộc' });
      return;
    }

    const result = await query(
      `INSERT INTO Suppliers (
        id, store_id, name, contact_person, email, phone, address, tax_code, notes, created_at, updated_at
      )
      OUTPUT INSERTED.*
      VALUES (
        NEWID(), @storeId, @name, @contactPerson, @email, @phone, @address, @taxCode, @notes, GETDATE(), GETDATE()
      )`,
      {
        storeId,
        name,
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        taxCode: taxCode || null,
        notes: notes || null,
      }
    );

    const supplier = result[0];
    res.status(201).json({
      id: supplier.id,
      storeId: supplier.store_id,
      name: supplier.name,
      contactPerson: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      taxCode: supplier.tax_code,
      notes: supplier.notes,
      createdAt: supplier.created_at,
      updatedAt: supplier.updated_at,
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;
    const { name, contactPerson, email, phone, address, taxCode, notes } = req.body;

    const existing = await queryOne(
      'SELECT id FROM Suppliers WHERE id = @id AND store_id = @storeId',
      { id, storeId }
    );

    if (!existing) {
      res.status(404).json({ error: 'Không tìm thấy nhà cung cấp' });
      return;
    }

    await query(
      `UPDATE Suppliers SET
        name = COALESCE(@name, name),
        contact_person = @contactPerson,
        email = @email,
        phone = @phone,
        address = @address,
        tax_code = @taxCode,
        notes = @notes,
        updated_at = GETDATE()
      WHERE id = @id AND store_id = @storeId`,
      {
        id,
        storeId,
        name,
        contactPerson: contactPerson !== undefined ? contactPerson : null,
        email: email !== undefined ? email : null,
        phone: phone !== undefined ? phone : null,
        address: address !== undefined ? address : null,
        taxCode: taxCode !== undefined ? taxCode : null,
        notes: notes !== undefined ? notes : null,
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    const existing = await queryOne(
      'SELECT id FROM Suppliers WHERE id = @id AND store_id = @storeId',
      { id, storeId }
    );

    if (!existing) {
      res.status(404).json({ error: 'Không tìm thấy nhà cung cấp' });
      return;
    }

    await query('DELETE FROM Suppliers WHERE id = @id AND store_id = @storeId', { id, storeId });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

// POST /api/suppliers/seed-purchases - Seed sample purchase data for suppliers
router.post('/seed-purchases', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    
    // Get suppliers for this store
    const suppliers = await query(
      'SELECT id, name FROM Suppliers WHERE store_id = @storeId',
      { storeId }
    ) as Array<{ id: string; name: string }>;

    if (suppliers.length === 0) {
      res.status(400).json({ error: 'Không có nhà cung cấp nào' });
      return;
    }

    // Get products for this store
    const products = await query(
      'SELECT id, name, cost FROM Products WHERE store_id = @storeId',
      { storeId }
    ) as Array<{ id: string; name: string; cost: number }>;

    if (products.length === 0) {
      res.status(400).json({ error: 'Không có sản phẩm nào' });
      return;
    }

    const results: Array<{ supplier: string; totalPurchase: number; totalPaid: number; debt: number }> = [];

    for (const supplier of suppliers) {
      // Check if already has purchases
      const existingPurchase = await queryOne(
        'SELECT COUNT(*) as count FROM PurchaseOrders WHERE supplier_id = @supplierId AND store_id = @storeId',
        { supplierId: supplier.id, storeId }
      ) as { count: number } | null;

      if (existingPurchase && existingPurchase.count > 0) {
        continue; // Skip if already has data
      }

      // Create 2-3 purchase orders per supplier
      const numOrders = Math.floor(Math.random() * 2) + 2;
      let totalPurchaseAmount = 0;

      for (let i = 0; i < numOrders; i++) {
        const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const daysAgo = Math.floor(Math.random() * 60) + 1;
        const importDate = new Date();
        importDate.setDate(importDate.getDate() - daysAgo);

        // Random products for this order
        const numProducts = Math.min(Math.floor(Math.random() * 4) + 2, products.length);
        const shuffledProducts = [...products].sort(() => Math.random() - 0.5).slice(0, numProducts);
        
        let orderTotal = 0;
        const orderItems: Array<{ productId: string; quantity: number; cost: number }> = [];

        for (const product of shuffledProducts) {
          const quantity = Math.floor(Math.random() * 50) + 10;
          const cost = product.cost || Math.floor(Math.random() * 500000) + 50000;
          orderTotal += quantity * cost;
          orderItems.push({ productId: product.id, quantity, cost });
        }

        // Create purchase order
        const purchaseResult = await query(
          `INSERT INTO PurchaseOrders (id, store_id, order_number, supplier_id, import_date, total_amount, notes, created_at, updated_at)
           OUTPUT INSERTED.id
           VALUES (NEWID(), @storeId, @orderNumber, @supplierId, @importDate, @totalAmount, @notes, GETDATE(), GETDATE())`,
          {
            storeId,
            orderNumber,
            supplierId: supplier.id,
            importDate: importDate.toISOString(),
            totalAmount: orderTotal,
            notes: `Đơn nhập hàng từ ${supplier.name}`
          }
        ) as Array<{ id: string }>;

        const purchaseId = purchaseResult[0].id;

        // Create purchase order items
        for (const item of orderItems) {
          await query(
            `INSERT INTO PurchaseOrderItems (id, purchase_order_id, product_id, quantity, cost, created_at)
             VALUES (NEWID(), @purchaseOrderId, @productId, @quantity, @cost, GETDATE())`,
            {
              purchaseOrderId: purchaseId,
              productId: item.productId,
              quantity: item.quantity,
              cost: item.cost
            }
          );
        }

        totalPurchaseAmount += orderTotal;
      }

      // Create partial payment (50-80% of total)
      const paymentPercentage = (Math.random() * 30 + 50) / 100;
      const paymentAmount = Math.floor(totalPurchaseAmount * paymentPercentage);

      if (paymentAmount > 0) {
        const paymentDate = new Date();
        paymentDate.setDate(paymentDate.getDate() - Math.floor(Math.random() * 30));

        await query(
          `INSERT INTO SupplierPayments (id, store_id, supplier_id, payment_date, amount, notes, created_at)
           VALUES (NEWID(), @storeId, @supplierId, @paymentDate, @amount, @notes, GETDATE())`,
          {
            storeId,
            supplierId: supplier.id,
            paymentDate: paymentDate.toISOString(),
            amount: paymentAmount,
            notes: `Thanh toán cho ${supplier.name}`
          }
        );
      }

      results.push({
        supplier: supplier.name,
        totalPurchase: totalPurchaseAmount,
        totalPaid: paymentAmount,
        debt: totalPurchaseAmount - paymentAmount
      });
    }

    res.json({ 
      success: true, 
      message: `Đã tạo dữ liệu cho ${results.length} nhà cung cấp`,
      results 
    });
  } catch (error) {
    console.error('Seed purchases error:', error);
    res.status(500).json({ error: 'Failed to seed purchases' });
  }
});

export default router;
