import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, insert } from '../src/db';

async function syncOnlineToPhysical() {
  console.log('🔄 Tạo cửa hàng vật lý từ cửa hàng online...\n');

  try {
    // Lấy tất cả online stores
    const onlineStores = await query<{
      id: string;
      store_name: string;
      slug: string;
      description: string;
      contact_email: string;
      contact_phone: string;
      address: string;
    }>('SELECT id, store_name, slug, description, contact_email, contact_phone, address FROM OnlineStores');

    console.log(`📦 Tìm thấy ${onlineStores.length} cửa hàng online\n`);

    // Lấy store owner mặc định
    const storeOwner = await queryOne<{ id: string }>(
      'SELECT TOP 1 id FROM StoreOwners'
    );
    if (!storeOwner) {
      console.log('❌ Không tìm thấy StoreOwner!');
      process.exit(1);
    }

    // Lấy user đầu tiên để thêm vào UserStores
    const user = await queryOne<{ id: string }>('SELECT TOP 1 id FROM Users');
    if (!user) {
      console.log('❌ Không tìm thấy User!');
      process.exit(1);
    }

    for (const online of onlineStores) {
      // Kiểm tra xem đã có store vật lý với slug này chưa
      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM Stores WHERE slug = @slug',
        { slug: online.slug }
      );

      if (existing) {
        console.log(`⏭️ ${online.store_name}: Đã có cửa hàng vật lý (${existing.id})`);
        // Cập nhật online store để liên kết với physical store
        await query(
          'UPDATE OnlineStores SET store_id = @storeId WHERE id = @id',
          { storeId: existing.id, id: online.id }
        );
        continue;
      }

      // Tạo cửa hàng vật lý mới
      const storeId = uuidv4();
      await insert('Stores', {
        id: storeId,
        owner_id: storeOwner.id,
        name: online.store_name,
        slug: online.slug,
        description: online.description,
        address: online.address,
        phone: online.contact_phone,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Thêm user vào UserStores
      await insert('UserStores', {
        id: uuidv4(),
        user_id: user.id,
        store_id: storeId,
        role: 'owner',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Cập nhật online store để liên kết với physical store mới
      await query(
        'UPDATE OnlineStores SET store_id = @storeId WHERE id = @id',
        { storeId: storeId, id: online.id }
      );

      console.log(`✅ ${online.store_name}: Đã tạo cửa hàng vật lý (${storeId})`);
    }

    console.log('\n🎉 Hoàn thành!');
    
    // Hiển thị kết quả
    const stores = await query<{ name: string; slug: string }>(
      'SELECT name, slug FROM Stores WHERE status = \'active\''
    );
    console.log('\n📋 Danh sách cửa hàng vật lý:');
    stores.forEach(s => console.log(`   - ${s.name} (${s.slug})`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

syncOnlineToPhysical();
