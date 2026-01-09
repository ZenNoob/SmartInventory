import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(storeContext);

// GET /api/customers
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    
    const customers = await query(
      'SELECT * FROM Customers WHERE store_id = @storeId ORDER BY full_name',
      { storeId }
    );

    res.json(customers.map((c: Record<string, unknown>) => ({
      id: c.id,
      storeId: c.store_id,
      email: c.email,
      name: c.full_name,
      phone: c.phone,
      address: c.address,
      status: c.status,
      loyaltyTier: c.loyalty_tier,
      customerType: c.customer_type,
      customerGroup: c.customer_group,
      lifetimePoints: c.lifetime_points,
      notes: c.notes,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })));
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to get customers' });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    const c = await queryOne(
      'SELECT * FROM Customers WHERE id = @id AND store_id = @storeId',
      { id, storeId }
    );

    if (!c) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json({
      id: c.id,
      storeId: c.store_id,
      email: c.email,
      name: c.full_name,
      phone: c.phone,
      address: c.address,
      status: c.status,
      loyaltyTier: c.loyalty_tier,
      customerType: c.customer_type,
      customerGroup: c.customer_group,
      lifetimePoints: c.lifetime_points,
      notes: c.notes,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

// TODO: Implement POST, PUT, DELETE

// POST /api/customers
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const {
      name,
      email,
      phone,
      address,
      customerType,
      customerGroup,
      status,
      lifetimePoints,
      loyaltyTier,
      notes,
    } = req.body;

    const result = await queryOne(
      `INSERT INTO Customers (
        store_id, full_name, email, phone, address, customer_type, customer_group,
        status, lifetime_points, loyalty_tier, notes,
        created_at, updated_at
      ) OUTPUT INSERTED.id VALUES (
        @storeId, @name, @email, @phone, @address, @customerType, @customerGroup,
        @status, @lifetimePoints, @loyaltyTier, @notes,
        GETDATE(), GETDATE()
      )`,
      {
        storeId,
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        customerType: customerType || 'personal',
        customerGroup: customerGroup || null,
        status: status || 'active',
        lifetimePoints: lifetimePoints || 0,
        loyaltyTier: loyaltyTier || null,
        notes: notes || null,
      }
    );

    res.status(201).json({ id: result?.id, success: true });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;
    const {
      name,
      email,
      phone,
      address,
      customerType,
      customerGroup,
      status,
      lifetimePoints,
      loyaltyTier,
      notes,
    } = req.body;

    // Check if customer exists
    const existing = await queryOne(
      'SELECT id FROM Customers WHERE id = @id AND store_id = @storeId',
      { id, storeId }
    );

    if (!existing) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    await query(
      `UPDATE Customers SET
        full_name = @name,
        email = @email,
        phone = @phone,
        address = @address,
        customer_type = @customerType,
        customer_group = @customerGroup,
        status = @status,
        lifetime_points = @lifetimePoints,
        loyalty_tier = @loyaltyTier,
        notes = @notes,
        updated_at = GETDATE()
      WHERE id = @id AND store_id = @storeId`,
      {
        id,
        storeId,
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        customerType: customerType || 'personal',
        customerGroup: customerGroup || null,
        status: status || 'active',
        lifetimePoints: lifetimePoints || 0,
        loyaltyTier: loyaltyTier || null,
        notes: notes || null,
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    await query(
      'DELETE FROM Customers WHERE id = @id AND store_id = @storeId',
      { id, storeId }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// GET /api/customers/:id/debt - Lấy thông tin công nợ và lịch sử thanh toán
router.get('/:id/debt', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;
    const includeHistory = req.query.includeHistory === 'true';

    // Lấy tổng tiền bán hàng (công nợ phát sinh)
    const salesResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as totalSales
       FROM Sales 
       WHERE customer_id = @id AND store_id = @storeId`,
      { id, storeId }
    );
    const totalSales = (salesResult[0] as { totalSales: number })?.totalSales || 0;

    // Lấy tổng tiền đã thanh toán
    const paymentsResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as totalPayments
       FROM Payments 
       WHERE customer_id = @id AND store_id = @storeId`,
      { id, storeId }
    );
    const totalPayments = (paymentsResult[0] as { totalPayments: number })?.totalPayments || 0;

    // Tính công nợ hiện tại
    const currentDebt = totalSales - totalPayments;

    // Lấy hạn mức tín dụng của khách hàng
    const customer = await query(
      `SELECT credit_limit FROM Customers WHERE id = @id AND store_id = @storeId`,
      { id, storeId }
    );
    const creditLimit = (customer[0] as { credit_limit: number })?.credit_limit || 0;

    const debtInfo = {
      totalSales,
      totalPayments,
      currentDebt,
      creditLimit,
      availableCredit: Math.max(0, creditLimit - currentDebt),
      isOverLimit: creditLimit > 0 && currentDebt > creditLimit,
    };

    let history: Array<{
      id: string;
      type: 'sale' | 'payment';
      date: string;
      amount: number;
      description: string;
      runningBalance: number;
    }> = [];

    if (includeHistory) {
      // Lấy lịch sử bán hàng
      const sales = await query(
        `SELECT id, created_at as date, total_amount as amount, 'sale' as type
         FROM Sales 
         WHERE customer_id = @id AND store_id = @storeId
         ORDER BY created_at ASC`,
        { id, storeId }
      );

      // Lấy lịch sử thanh toán
      const payments = await query(
        `SELECT id, payment_date as date, amount, notes, 'payment' as type
         FROM Payments 
         WHERE customer_id = @id AND store_id = @storeId
         ORDER BY payment_date ASC`,
        { id, storeId }
      );

      // Kết hợp và sắp xếp theo thời gian
      const allTransactions = [
        ...sales.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          type: 'sale' as const,
          date: s.date as string,
          amount: s.amount as number,
          description: 'Mua hàng',
        })),
        ...payments.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          type: 'payment' as const,
          date: p.date as string,
          amount: -(p.amount as number), // Âm vì là trả nợ
          description: (p.notes as string) || 'Thanh toán công nợ',
        })),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Tính số dư chạy
      let runningBalance = 0;
      history = allTransactions.map(t => {
        runningBalance += t.type === 'sale' ? t.amount : -t.amount;
        return {
          ...t,
          runningBalance,
        };
      });
    }

    res.json({
      success: true,
      debtInfo,
      history,
    });
  } catch (error) {
    console.error('Get customer debt error:', error);
    res.status(500).json({ error: 'Failed to get customer debt' });
  }
});

export default router;
