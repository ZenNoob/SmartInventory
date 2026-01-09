import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, insert, update, remove } from '../db';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';

const router = Router();

interface UnitRecord {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  base_unit_id: string | null;
  conversion_factor: number | null;
  created_at: Date;
  updated_at: Date;
}

router.use(authenticate);
router.use(storeContext);

// GET /api/units
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    
    const units = await query<UnitRecord>(
      'SELECT * FROM Units WHERE store_id = @storeId ORDER BY name',
      { storeId }
    );

    res.json(units.map(u => ({
      id: u.id,
      name: u.name,
      description: u.description,
      baseUnitId: u.base_unit_id,
      conversionFactor: u.conversion_factor,
    })));
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({ error: 'Failed to get units' });
  }
});

// GET /api/units/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    const unit = await queryOne<UnitRecord>(
      'SELECT * FROM Units WHERE id = @id AND store_id = @storeId',
      { id, storeId }
    );

    if (!unit) {
      res.status(404).json({ error: 'Không tìm thấy đơn vị' });
      return;
    }

    res.json({
      id: unit.id,
      name: unit.name,
      description: unit.description,
      baseUnitId: unit.base_unit_id,
      conversionFactor: unit.conversion_factor,
    });
  } catch (error) {
    console.error('Get unit error:', error);
    res.status(500).json({ error: 'Failed to get unit' });
  }
});

// POST /api/units
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { name, description, baseUnitId, conversionFactor } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const result = await insert<UnitRecord>('Units', {
      id: uuidv4(),
      store_id: storeId,
      name: name,
      description: description || null,
      base_unit_id: baseUnitId || null,
      conversion_factor: conversionFactor || null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    if (!result) {
      res.status(500).json({ error: 'Failed to create unit' });
      return;
    }

    res.status(201).json({
      id: result.id,
      name: result.name,
      description: result.description,
      baseUnitId: result.base_unit_id,
      conversionFactor: result.conversion_factor,
    });
  } catch (error) {
    console.error('Create unit error:', error);
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

// PUT /api/units/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;
    const { name, description, baseUnitId, conversionFactor } = req.body;

    const existing = await queryOne<UnitRecord>(
      'SELECT * FROM Units WHERE id = @id AND store_id = @storeId',
      { id, storeId }
    );

    if (!existing) {
      res.status(404).json({ error: 'Unit not found' });
      return;
    }

    const result = await update<UnitRecord>('Units', id, {
      name: name || existing.name,
      description: description !== undefined ? description : existing.description,
      base_unit_id: baseUnitId !== undefined ? baseUnitId : existing.base_unit_id,
      conversion_factor: conversionFactor !== undefined ? conversionFactor : existing.conversion_factor,
      updated_at: new Date(),
    });

    res.json({
      id: result?.id,
      name: result?.name,
      description: result?.description,
      baseUnitId: result?.base_unit_id,
      conversionFactor: result?.conversion_factor,
    });
  } catch (error) {
    console.error('Update unit error:', error);
    res.status(500).json({ error: 'Failed to update unit' });
  }
});

// DELETE /api/units/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    const existing = await queryOne<UnitRecord>(
      'SELECT * FROM Units WHERE id = @id AND store_id = @storeId',
      { id, storeId }
    );

    if (!existing) {
      res.status(404).json({ error: 'Unit not found' });
      return;
    }

    await remove('Units', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete unit error:', error);
    res.status(500).json({ error: 'Failed to delete unit' });
  }
});

export default router;
