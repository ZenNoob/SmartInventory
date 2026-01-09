import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';

const router = Router();

// GET /api/storefront/:slug/config - Public endpoint
router.get('/:slug/config', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const store = await queryOne(
      `SELECT * FROM OnlineStores WHERE slug = @slug AND is_active = 1`,
      { slug }
    );

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    res.json({
      store: {
        id: store.id,
        storeName: store.store_name,
        slug: store.slug,
        logo: store.logo,
        favicon: store.favicon,
        description: store.description,
        themeId: store.theme_id,
        primaryColor: store.primary_color,
        secondaryColor: store.secondary_color,
        fontFamily: store.font_family,
        contactEmail: store.contact_email,
        contactPhone: store.contact_phone,
        address: store.address,
        facebookUrl: store.facebook_url,
        instagramUrl: store.instagram_url,
        currency: store.currency,
      }
    });
  } catch (error) {
    console.error('Get storefront config error:', error);
    res.status(500).json({ error: 'Failed to get store config' });
  }
});

// GET /api/storefront/:slug/products - Public endpoint
router.get('/:slug/products', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { category, search, page = '1', limit = '20' } = req.query;

    // First get the online store
    const store = await queryOne(
      `SELECT * FROM OnlineStores WHERE slug = @slug AND is_active = 1`,
      { slug }
    );

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    // Build query for online products - using correct column names from schema
    let productQuery = `
      SELECT op.id, op.online_store_id, op.product_id, op.category_id,
             op.is_published, op.online_price, op.online_description,
             op.display_order, op.seo_title, op.seo_description, op.seo_slug, op.images,
             p.name as product_name, p.sku, p.cost_price, p.stock_quantity,
             c.name as category_name
      FROM OnlineProducts op
      LEFT JOIN Products p ON op.product_id = p.id
      LEFT JOIN Categories c ON op.category_id = c.id
      WHERE op.online_store_id = @onlineStoreId AND op.is_published = 1
    `;
    const params: Record<string, unknown> = { onlineStoreId: store.id };

    if (category) {
      productQuery += ` AND op.category_id = @categoryId`;
      params.categoryId = category;
    }

    if (search) {
      productQuery += ` AND (p.name LIKE @search OR op.online_description LIKE @search)`;
      params.search = `%${search}%`;
    }

    productQuery += ` ORDER BY op.display_order ASC, op.created_at DESC`;

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;
    
    productQuery += ` OFFSET ${offset} ROWS FETCH NEXT ${limitNum} ROWS ONLY`;

    const products = await query(productQuery, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total FROM OnlineProducts op
      LEFT JOIN Products p ON op.product_id = p.id
      WHERE op.online_store_id = @onlineStoreId AND op.is_published = 1
    `;
    if (category) {
      countQuery += ` AND op.category_id = @categoryId`;
    }
    if (search) {
      countQuery += ` AND (p.name LIKE @search OR op.online_description LIKE @search)`;
    }
    
    const countResult = await queryOne(countQuery, params);
    const total = countResult?.total || 0;

    res.json({
      store: {
        name: store.store_name,
        logo: store.logo,
        currency: store.currency,
      },
      products: products.map((p: Record<string, unknown>) => {
        let images: string[] = [];
        if (p.images) {
          try {
            images = JSON.parse(p.images as string);
          } catch {
            // If not JSON, treat as single URL
            images = [p.images as string];
          }
        }
        const stockQuantity = (p.stock_quantity as number) || 0;
        return {
          id: p.id,
          name: p.product_name,
          slug: p.seo_slug,
          description: p.online_description,
          price: p.online_price,
          images,
          categoryId: p.category_id,
          categoryName: p.category_name,
          sku: p.sku,
          seoTitle: p.seo_title,
          seoDescription: p.seo_description,
          stockQuantity: stockQuantity,
          inStock: stockQuantity > 0,
        };
      }),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      }
    });
  } catch (error) {
    console.error('Get storefront products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// GET /api/storefront/:slug/products/:productSlug - Public endpoint
router.get('/:slug/products/:productSlug', async (req: Request, res: Response) => {
  try {
    const { slug, productSlug } = req.params;

    const store = await queryOne(
      `SELECT * FROM OnlineStores WHERE slug = @slug AND is_active = 1`,
      { slug }
    );

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const product = await queryOne(
      `SELECT op.*, p.name as product_name, p.sku, p.stock_quantity, c.name as category_name
       FROM OnlineProducts op
       LEFT JOIN Products p ON op.product_id = p.id
       LEFT JOIN Categories c ON op.category_id = c.id
       WHERE op.online_store_id = @onlineStoreId AND op.seo_slug = @productSlug AND op.is_published = 1`,
      { onlineStoreId: store.id, productSlug }
    );

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const stockQuantity = product.stock_quantity || 0;

    res.json({
      product: {
        id: product.id,
        name: product.product_name,
        slug: product.seo_slug,
        description: product.online_description,
        price: product.online_price,
        images: product.images ? ((() => { try { return JSON.parse(product.images); } catch { return [product.images]; } })()) : [],
        categoryId: product.category_id,
        categoryName: product.category_name,
        sku: product.sku,
        seoTitle: product.seo_title,
        seoDescription: product.seo_description,
        stockQuantity: stockQuantity,
        inStock: stockQuantity > 0,
      }
    });
  } catch (error) {
    console.error('Get storefront product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});


// GET /api/storefront/:slug/categories - Public endpoint
router.get('/:slug/categories', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const store = await queryOne(
      `SELECT * FROM OnlineStores WHERE slug = @slug AND is_active = 1`,
      { slug }
    );

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const categories = await query(
      `SELECT DISTINCT c.id, c.name, c.description
       FROM Categories c
       INNER JOIN OnlineProducts op ON c.id = op.category_id
       WHERE op.online_store_id = @onlineStoreId AND op.is_published = 1
       ORDER BY c.name`,
      { onlineStoreId: store.id }
    );

    res.json({ categories });
  } catch (error) {
    console.error('Get storefront categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// GET /api/storefront/:slug/cart - Public endpoint
router.get('/:slug/cart', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      res.json({
        cart: {
          id: '',
          items: [],
          subtotal: 0,
          discountAmount: 0,
          shippingFee: 0,
          total: 0,
          itemCount: 0,
        }
      });
      return;
    }

    const store = await queryOne(
      `SELECT id FROM OnlineStores WHERE slug = @slug AND is_active = 1`,
      { slug }
    );

    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const cart = await queryOne(
      `SELECT * FROM ShoppingCarts WHERE online_store_id = @onlineStoreId AND session_id = @sessionId`,
      { onlineStoreId: store.id, sessionId }
    );

    if (!cart) {
      res.json({
        cart: {
          id: '',
          items: [],
          subtotal: 0,
          discountAmount: 0,
          shippingFee: 0,
          total: 0,
          itemCount: 0,
        }
      });
      return;
    }

    const items = await query(
      `SELECT ci.*, p.name as product_name, op.images
       FROM CartItems ci
       LEFT JOIN OnlineProducts op ON ci.online_product_id = op.id
       LEFT JOIN Products p ON op.product_id = p.id
       WHERE ci.cart_id = @cartId`,
      { cartId: cart.id }
    );

    res.json({
      cart: {
        id: cart.id,
        items: items.map((item: Record<string, unknown>) => ({
          id: item.id,
          onlineProductId: item.online_product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
          images: item.images ? ((() => { try { return JSON.parse(item.images as string); } catch { return [item.images as string]; } })()) : [],
        })),
        subtotal: cart.subtotal,
        discountAmount: cart.discount_amount,
        shippingFee: cart.shipping_fee,
        total: cart.total,
        itemCount: items.reduce((sum: number, item: Record<string, unknown>) => sum + (item.quantity as number), 0),
      }
    });
  } catch (error) {
    console.error('Get storefront cart error:', error);
    res.status(500).json({ error: 'Failed to get cart' });
  }
});

export default router;
