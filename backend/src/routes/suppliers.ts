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
    
    const suppliers = await query(
      'SELECT * FROM Suppliers WHERE store_id = @storeId ORDER BY name',
      { storeId }
    );

    res.json(suppliers.map((s: Record<string, unknown>) => ({
      id: s.id,
      storeId: s.store_id,
      name: s.name,
      contactPerson: s.contact_person,
      email: s.email,
      phone: s.phone,
      address: s.address,
      taxCode: s.tax_code,
      notes: s.notes,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })));
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

export default router;
