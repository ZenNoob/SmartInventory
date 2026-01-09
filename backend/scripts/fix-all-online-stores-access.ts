import 'dotenv/config';
import { query } from '../src/db';

async function fixAllOnlineStoresAccess() {
  console.log('🔧 Kiểm tra và sửa quyền truy cập cho TẤT CẢ cửa hàng online...\n');

  try {
    // Lấy tất cả online stores
    const onlineStores = await query<{
      id: string;
      store_name: string;
      slug: string;
      store_id: string;
      physical_store_name: string;
    }>(
      `SELECT 
        os.id,
        os.store_name,
        os.slug,
        os.store_id,
        s.name as physical_store_name
       FROM OnlineStores os
       LEFT JOIN Stores s ON os.store_id = s.id
       WHERE os.is_active = 1
       ORDER BY os.created_at DESC`
    );

    if (onlineStores.length === 0) {
      console.log('❌ Không tìm thấy cửa hàng online nào');
      process.exit(0);
    }

    console.log(`📦 Tìm thấy ${onlineStores.length} cửa hàng online\n`);

    // Lấy danh sách tất cả users
    const allUsers = await query<{ id: string; display_name: string; email: string }>(
      'SELECT id, display_name, email FROM Users WHERE status = \'active\''
    );

    console.log(`👥 Có ${allUsers.length} users active\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let totalAdded = 0;
    let totalSkipped = 0;
    let storesFixed = 0;

    for (const store of onlineStores) {
      console.log(`\n🏪 ${store.store_name} (${store.slug})`);

      if (!store.physical_store_name) {
        console.log('   ⚠️  Bỏ qua - Không có physical store tương ứng\n');
        continue;
      }

      // Kiểm tra users nào đã có quyền truy cập
      const existingAccess = await query<{ user_id: string; display_name: string }>(
        `SELECT us.user_id, u.display_name
         FROM UserStores us
         JOIN Users u ON us.user_id = u.id
         WHERE us.store_id = @storeId`,
        { storeId: store.store_id }
      );

      const existingUserIds = new Set(existingAccess.map((a: { user_id: string }) => a.user_id));

      console.log(`   Hiện có ${existingAccess.length}/${allUsers.length} users có quyền truy cập`);

      let added = 0;

      for (const user of allUsers) {
        if (existingUserIds.has(user.id)) {
          continue;
        }

        // Thêm user vào store với role manager
        await query(
          `INSERT INTO UserStores (id, user_id, store_id, role, created_at, updated_at)
           VALUES (NEWID(), @userId, @storeId, 'manager', GETDATE(), GETDATE())`,
          { userId: user.id, storeId: store.store_id }
        );

        added++;
        totalAdded++;
      }

      if (added > 0) {
        console.log(`   ✅ Đã thêm ${added} users mới`);
        storesFixed++;
      } else {
        console.log(`   ✓ Không cần thay đổi`);
      }

      totalSkipped += existingAccess.length;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ HOÀN THÀNH!\n');
    console.log(`📊 Thống kê:`);
    console.log(`   - Số cửa hàng đã sửa: ${storesFixed}/${onlineStores.length}`);
    console.log(`   - Tổng số quyền truy cập đã thêm: ${totalAdded}`);
    console.log(`   - Tổng số quyền truy cập đã có sẵn: ${totalSkipped}`);
    console.log(`\n💡 Bây giờ tất cả users đều có thể thấy tất cả các cửa hàng online!`);
    console.log(`   Refresh lại trang Online Stores để xem kết quả.\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

fixAllOnlineStoresAccess();
