import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function syncAllOnlineProducts() {
  console.log('🔄 Đồng bộ tất cả sản phẩm sang cửa hàng online...\n');

  const pool = await sql.connect(config);

  try {
    // Lấy tất cả online stores
    const onlineStores = await pool.request().query(`
      SELECT os.id, os.store_name, os.slug, os.store_id, s.name as physical_store_name
      FROM OnlineStores os
      JOIN Stores s ON os.store_id = s.id
      WHERE os.is_active = 1
    `);

    console.log(`📦 Tìm thấy ${onlineStores.recordset.length} cửa hàng online\n`);

    for (const store of onlineStores.recordset) {
      console.log(`\n🏪 ${store.store_name} (linked to: ${store.physical_store_name}):`);

      // Xóa sản phẩm online cũ (giữ lại những sản phẩm có trong đơn hàng)
      await pool.request()
        .input('onlineStoreId', sql.UniqueIdentifier, store.id)
        .query(`
          DELETE FROM OnlineProducts 
          WHERE online_store_id = @onlineStoreId 
          AND id NOT IN (
            SELECT DISTINCT online_product_id 
            FROM OnlineOrderItems 
            WHERE online_product_id IS NOT NULL
          )
        `);
      console.log('   🗑️ Đã xóa sản phẩm online cũ');

      // Lấy tất cả sản phẩm từ cửa hàng vật lý
      const products = await pool.request()
        .input('storeId', sql.UniqueIdentifier, store.store_id)
        .query(`
          SELECT p.id, p.name, p.description, p.price, p.cost_price, 
                 p.stock_quantity, p.images, p.sku, c.name as category_name
          FROM Products p
          LEFT JOIN Categories c ON p.category_id = c.id
          WHERE p.store_id = @storeId AND p.status = 'active'
          ORDER BY c.name, p.name
        `);

      console.log(`   📋 Tìm thấy ${products.recordset.length} sản phẩm`);

      let synced = 0;
      let skipped = 0;

      for (const product of products.recordset) {
        // Kiểm tra sản phẩm đã tồn tại chưa
        const existing = await pool.request()
          .input('productId', sql.UniqueIdentifier, product.id)
          .input('onlineStoreId', sql.UniqueIdentifier, store.id)
          .query(`
            SELECT id FROM OnlineProducts 
            WHERE product_id = @productId AND online_store_id = @onlineStoreId
          `);

        if (existing.recordset.length > 0) {
          skipped++;
          continue;
        }

        // Generate unique slug
        let baseSlug = generateSlug(product.name);
        let slug = baseSlug;
        let counter = 1;

        while (true) {
          const slugCheck = await pool.request()
            .input('slug', sql.NVarChar, slug)
            .input('onlineStoreId', sql.UniqueIdentifier, store.id)
            .query(`
              SELECT 1 FROM OnlineProducts 
              WHERE seo_slug = @slug AND online_store_id = @onlineStoreId
            `);

          if (slugCheck.recordset.length === 0) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        // Insert online product
        const onlineProductId = uuidv4();
        await pool.request()
          .input('id', sql.UniqueIdentifier, onlineProductId)
          .input('onlineStoreId', sql.UniqueIdentifier, store.id)
          .input('productId', sql.UniqueIdentifier, product.id)
          .input('price', sql.Decimal(18, 2), product.price)
          .input('description', sql.NVarChar, product.description || `${product.name} - ${product.category_name || 'Sản phẩm'}`)
          .input('displayOrder', sql.Int, synced)
          .input('seoSlug', sql.NVarChar, slug)
          .input('images', sql.NVarChar, product.images)
          .query(`
            INSERT INTO OnlineProducts (
              id, online_store_id, product_id, is_published, online_price,
              online_description, display_order, seo_slug, images, created_at, updated_at
            ) VALUES (
              @id, @onlineStoreId, @productId, 1, @price,
              @description, @displayOrder, @seoSlug, @images, GETDATE(), GETDATE()
            )
          `);

        synced++;
      }

      console.log(`   ✅ Đồng bộ: ${synced} mới, ${skipped} đã tồn tại`);
    }

    // Thống kê cuối
    console.log('\n📊 Thống kê:');
    const stats = await pool.request().query(`
      SELECT os.store_name, COUNT(op.id) as online_products
      FROM OnlineStores os
      LEFT JOIN OnlineProducts op ON os.id = op.online_store_id
      WHERE os.is_active = 1
      GROUP BY os.id, os.store_name
    `);
    console.table(stats.recordset);

    console.log('\n🎉 Hoàn tất!');
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await pool.close();
  }
}

syncAllOnlineProducts();
