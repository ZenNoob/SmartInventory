import 'dotenv/config';
import { query, queryOne } from '../src/db';

// Mapping: slug cửa hàng online -> tên category
const STORE_CATEGORY_MAP: Record<string, string> = {
  'pokemon': 'Thẻ bài Pokemon',
  'yugioh-strore': 'Thẻ bài Yugioh',
  'yugioh-store': 'Thẻ bài Yugioh',
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

async function syncOnlineProducts() {
  console.log('🔄 Bắt đầu đồng bộ sản phẩm online...\n');

  try {
    // Lấy tất cả online stores
    const onlineStores = await query<{ id: string; slug: string; store_id: string }>(
      'SELECT id, slug, store_id FROM OnlineStores WHERE is_active = 1'
    );

    console.log(`📦 Tìm thấy ${onlineStores.length} cửa hàng online\n`);

    for (const store of onlineStores) {
      const categoryName = STORE_CATEGORY_MAP[store.slug];
      
      if (!categoryName) {
        console.log(`⏭️  Bỏ qua cửa hàng "${store.slug}" - không có mapping category`);
        continue;
      }

      console.log(`\n🏪 Xử lý cửa hàng: ${store.slug}`);
      console.log(`   Category: ${categoryName}`);

      // Tìm category ID
      const category = await queryOne<{ id: string }>(
        'SELECT id FROM Categories WHERE name = @name AND store_id = @storeId',
        { name: categoryName, storeId: store.store_id }
      );

      if (!category) {
        console.log(`   ❌ Không tìm thấy category "${categoryName}"`);
        continue;
      }

      // Xóa sản phẩm cũ của cửa hàng này (chỉ những sản phẩm không có trong đơn hàng)
      await query(
        `DELETE FROM OnlineProducts 
         WHERE online_store_id = @onlineStoreId 
         AND id NOT IN (SELECT DISTINCT online_product_id FROM OnlineOrderItems WHERE online_product_id IS NOT NULL)`,
        { onlineStoreId: store.id }
      );
      console.log(`   🗑️  Đã xóa sản phẩm cũ (giữ lại sản phẩm có trong đơn hàng)`);

      // Lấy sản phẩm theo category
      const products = await query<{
        id: string;
        name: string;
        description: string | null;
        price: number;
        images: string | null;
        category_id: string;
      }>(
        'SELECT id, name, description, price, images, category_id FROM Products WHERE store_id = @storeId AND category_id = @categoryId',
        { storeId: store.store_id, categoryId: category.id }
      );

      console.log(`   📋 Tìm thấy ${products.length} sản phẩm thuộc category "${categoryName}"`);

      let synced = 0;
      for (const product of products) {
        // Kiểm tra xem sản phẩm đã tồn tại chưa
        const existingProduct = await queryOne(
          'SELECT 1 FROM OnlineProducts WHERE product_id = @productId AND online_store_id = @onlineStoreId',
          { productId: product.id, onlineStoreId: store.id }
        );
        
        if (existingProduct) {
          continue; // Bỏ qua nếu đã tồn tại
        }

        // Generate unique slug
        let baseSlug = generateSlug(product.name);
        let slug = baseSlug;
        let counter = 1;

        // Check slug availability
        while (true) {
          const existing = await queryOne(
            'SELECT 1 FROM OnlineProducts WHERE seo_slug = @slug AND online_store_id = @onlineStoreId',
            { slug, onlineStoreId: store.id }
          );
          if (!existing) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        // Insert online product (không dùng category_id vì có FK constraint với OnlineCategories)
        await query(
          `INSERT INTO OnlineProducts (
            id, online_store_id, product_id, is_published, online_price,
            online_description, display_order, seo_slug, images, created_at, updated_at
          ) VALUES (
            NEWID(), @onlineStoreId, @productId, 1, @price,
            @description, @displayOrder, @seoSlug, @images, GETDATE(), GETDATE()
          )`,
          {
            onlineStoreId: store.id,
            productId: product.id,
            price: product.price,
            description: product.description,
            displayOrder: synced,
            seoSlug: slug,
            images: product.images,
          }
        );
        synced++;
      }

      console.log(`   ✅ Đã đồng bộ ${synced} sản phẩm`);
    }

    console.log('\n✅ Hoàn thành đồng bộ!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

syncOnlineProducts();
