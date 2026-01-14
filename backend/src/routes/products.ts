import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(storeContext);

// GET /api/products
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    
    const products = await query(
      `SELECT p.*, c.name as category_name
       FROM Products p
       LEFT JOIN Categories c ON p.category_id = c.id
       WHERE p.store_id = @storeId
       ORDER BY p.name`,
      { storeId }
    );

    res.json(products.map((p: Record<string, unknown>) => ({
      id: p.id,
      storeId: p.store_id,
      categoryId: p.category_id,
      categoryName: p.category_name,
      name: p.name,
      description: p.description,
      price: p.price,
      costPrice: p.cost_price,
      sku: p.sku,
      barcode: p.sku, // Use sku as barcode for now
      stockQuantity: p.stock_quantity,
      unitId: p.unit_id,
      images: p.images,
      status: p.status,
      purchaseLots: [], // Empty array for now
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })));
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    const product = await queryOne(
      `SELECT p.*, c.name as category_name
       FROM Products p
       LEFT JOIN Categories c ON p.category_id = c.id
       WHERE p.id = @id AND p.store_id = @storeId`,
      { id, storeId }
    );

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json({
      id: product.id,
      storeId: product.store_id,
      categoryId: product.category_id,
      categoryName: product.category_name,
      name: product.name,
      description: product.description,
      price: product.price,
      costPrice: product.cost_price,
      sku: product.sku,
      stockQuantity: product.stock_quantity,
      images: product.images,
      status: product.status,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// POST /api/products
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { name, description, categoryId, price, costPrice, sku, stockQuantity, images, status } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Tên sản phẩm là bắt buộc' });
      return;
    }

    const result = await query(
      `INSERT INTO Products (
        id, store_id, category_id, name, description, price, cost_price, sku, 
        stock_quantity, images, status, created_at, updated_at
      )
      OUTPUT INSERTED.*
      VALUES (
        NEWID(), @storeId, @categoryId, @name, @description, @price, @costPrice, @sku,
        @stockQuantity, @images, @status, GETDATE(), GETDATE()
      )`,
      {
        storeId,
        categoryId: categoryId || null,
        name,
        description: description || null,
        price: price || 0,
        costPrice: costPrice || 0,
        sku: sku || null,
        stockQuantity: stockQuantity || 0,
        images: images ? JSON.stringify(images) : null,
        status: status || 'active',
      }
    );

    const product = result[0];
    res.status(201).json({
      id: product.id,
      storeId: product.store_id,
      categoryId: product.category_id,
      name: product.name,
      description: product.description,
      price: product.price,
      costPrice: product.cost_price,
      sku: product.sku,
      stockQuantity: product.stock_quantity,
      images: product.images,
      status: product.status,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;
    const { name, description, categoryId, price, costPrice, sku, stockQuantity, images, status } = req.body;

    const existing = await queryOne(
      'SELECT id FROM Products WHERE id = @id AND store_id = @storeId',
      { id, storeId }
    );

    if (!existing) {
      res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
      return;
    }

    await query(
      `UPDATE Products SET
        name = COALESCE(@name, name),
        description = @description,
        category_id = @categoryId,
        price = COALESCE(@price, price),
        cost_price = COALESCE(@costPrice, cost_price),
        sku = @sku,
        stock_quantity = COALESCE(@stockQuantity, stock_quantity),
        images = @images,
        status = COALESCE(@status, status),
        updated_at = GETDATE()
      WHERE id = @id AND store_id = @storeId`,
      {
        id,
        storeId,
        name,
        description: description !== undefined ? description : null,
        categoryId: categoryId !== undefined ? categoryId : null,
        price,
        costPrice,
        sku: sku !== undefined ? sku : null,
        stockQuantity,
        images: images ? JSON.stringify(images) : null,
        status,
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;

    const existing = await queryOne(
      'SELECT id FROM Products WHERE id = @id AND store_id = @storeId',
      { id, storeId }
    );

    if (!existing) {
      res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
      return;
    }

    await query('DELETE FROM Products WHERE id = @id AND store_id = @storeId', { id, storeId });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
