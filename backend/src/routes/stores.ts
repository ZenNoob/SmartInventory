import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/stores - Lấy cửa hàng của user hiện tại
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const stores = await query(
      `SELECT s.* FROM Stores s
       INNER JOIN UserStores us ON s.id = us.store_id
       WHERE us.user_id = @userId
       ORDER BY s.name`,
      { userId }
    );

    res.json(stores.map((s: Record<string, unknown>) => ({
      id: s.id,
      ownerId: s.owner_id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      logoUrl: s.logo_url,
      domain: s.domain,
      status: s.status,
      settings: s.settings,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })));
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ error: 'Failed to get stores' });
  }
});

// GET /api/stores/all - Lấy tất cả cửa hàng (cho admin khi thêm user)
router.get('/all', async (req: AuthRequest, res: Response) => {
  try {
    const stores = await query(
      `SELECT * FROM Stores ORDER BY name`
    );

    res.json(stores.map((s: Record<string, unknown>) => ({
      id: s.id,
      ownerId: s.owner_id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      logoUrl: s.logo_url,
      domain: s.domain,
      status: s.status,
      settings: s.settings,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })));
  } catch (error) {
    console.error('Get all stores error:', error);
    res.status(500).json({ error: 'Failed to get all stores' });
  }
});

// GET /api/stores/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const s = await queryOne(
      `SELECT s.* FROM Stores s
       INNER JOIN UserStores us ON s.id = us.store_id
       WHERE s.id = @id AND us.user_id = @userId`,
      { id, userId }
    );

    if (!s) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    res.json({
      id: s.id,
      ownerId: s.owner_id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      logoUrl: s.logo_url,
      domain: s.domain,
      status: s.status,
      settings: s.settings,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    });
  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({ error: 'Failed to get store' });
  }
});

export default router;
