import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
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

    const customerId = uuidv4();

    await query(
      `INSERT INTO Customers (
        id, store_id, full_name, email, phone, address, customer_type, customer_group,
        status, lifetime_points, loyalty_tier, notes,
        created_at, updated_at
      ) VALUES (
        @id, @storeId, @name, @email, @phone, @address, @customerType, @customerGroup,
        @status, @lifetimePoints, @loyaltyTier, @notes,
        GETDATE(), GETDATE()
      )`,
      {
        id: customerId,
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

    res.status(201).json({ id: customerId, success: true });
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

export default router;
