import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/online-stores/all - Lấy tất cả online stores (cho admin)
router.get('/all', async (req: AuthRequest, res: Response) => {
  try {
    const stores = await query(
      'SELECT * FROM OnlineStores ORDER BY store_name'
    );

    res.json(
      stores.map((s: Record<string, unknown>) => ({
        id: s.id,
        storeId: s.store_id,
        slug: s.slug,
        customDomain: s.custom_domain,
        isActive: s.is_active,
        storeName: s.store_name,
        logo: s.logo,
        contactEmail: s.contact_email,
        createdAt: s.created_at,
      }))
    );
  } catch (error) {
    console.error('Get all online stores error:', error);
    res.status(500).json({ error: 'Failed to get all online stores' });
  }
});

// Các route còn lại cần storeContext
router.use(storeContext);

// GET /api/online-stores
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;

    const stores = await query(
      'SELECT * FROM OnlineStores WHERE store_id = @storeId ORDER BY created_at DESC',
      { storeId }
    );

    res.json(
      stores.map((s: Record<string, unknown>) => ({
        id: s.id,
        storeId: s.store_id,
        slug: s.slug,
        customDomain: s.custom_domain,
        isActive: s.is_active,
        storeName: s.store_name,
        logo: s.logo,
        favicon: s.favicon,
        description: s.description,
        themeId: s.theme_id,
        primaryColor: s.primary_color,
        secondaryColor: s.secondary_color,
        fontFamily: s.font_family,
        contactEmail: s.contact_email,
        contactPhone: s.contact_phone,
        address: s.address,
        facebookUrl: s.facebook_url,
        instagramUrl: s.instagram_url,
        currency: s.currency,
        timezone: s.timezone,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }))
    );
  } catch (error) {
    console.error('Get online stores error:', error);
    res.status(500).json({ error: 'Failed to get online stores' });
  }
});

// GET /api/online-stores/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    const s = await queryOne(
      'SELECT * FROM OnlineStores WHERE id = @id AND store_id = @storeId',
      { id, storeId }
    );

    if (!s) {
      res.status(404).json({ error: 'Online store not found' });
      return;
    }

    res.json({
      id: s.id,
      storeId: s.store_id,
      slug: s.slug,
      customDomain: s.custom_domain,
      isActive: s.is_active,
      storeName: s.store_name,
      logo: s.logo,
      favicon: s.favicon,
      description: s.description,
      themeId: s.theme_id,
      primaryColor: s.primary_color,
      secondaryColor: s.secondary_color,
      fontFamily: s.font_family,
      contactEmail: s.contact_email,
      contactPhone: s.contact_phone,
      address: s.address,
      facebookUrl: s.facebook_url,
      instagramUrl: s.instagram_url,
      currency: s.currency,
      timezone: s.timezone,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    });
  } catch (error) {
    console.error('Get online store error:', error);
    res.status(500).json({ error: 'Failed to get online store' });
  }
});

export default router;
