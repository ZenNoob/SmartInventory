import 'dotenv/config';
import { query, queryOne } from '../src/db';

async function clearSalesData() {
  console.log('🗑️ Bắt đầu xóa dữ liệu Sales mẫu...\n');

  try {
    // Lấy store_id
    const store = await queryOne<{ id: string; name: string }>(
      'SELECT TOP 1 id, name FROM Stores'
    );
    if (!store) {
      console.log('❌ Không tìm thấy Store nào!');
      process.exit(1);
    }
    console.log(`🏪 Store: ${store.name} (${store.id})`);

    // Đếm số lượng trước khi xóa
    const beforeStats = await queryOne<{ salesCount: number; itemsCount: number }>(
      `SELECT 
        (SELECT COUNT(*) FROM Sales WHERE store_id = @storeId) as salesCount,
        (SELECT COUNT(*) FROM SalesItems si 
         INNER JOIN Sales s ON si.sales_transaction_id = s.id 
         WHERE s.store_id = @storeId) as itemsCount`,
      { storeId: store.id }
    );

    console.log(`📊 Trước khi xóa:`);
    console.log(`   - Sales: ${beforeStats?.salesCount || 0} đơn hàng`);
    console.log(`   - SalesItems: ${beforeStats?.itemsCount || 0} items`);

    // Xóa SalesItems trước (do foreign key)
    console.log('\n🗑️ Đang xóa SalesItems...');
    await query(
      `DELETE FROM SalesItems WHERE sales_transaction_id IN 
       (SELECT id FROM Sales WHERE store_id = @storeId)`,
      { storeId: store.id }
    );

    // Xóa Sales
    console.log('🗑️ Đang xóa Sales...');
    await query(
      'DELETE FROM Sales WHERE store_id = @storeId',
      { storeId: store.id }
    );

    // Đếm số lượng sau khi xóa
    const afterStats = await queryOne<{ salesCount: number; itemsCount: number }>(
      `SELECT 
        (SELECT COUNT(*) FROM Sales WHERE store_id = @storeId) as salesCount,
        (SELECT COUNT(*) FROM SalesItems si 
         INNER JOIN Sales s ON si.sales_transaction_id = s.id 
         WHERE s.store_id = @storeId) as itemsCount`,
      { storeId: store.id }
    );

    console.log(`\n✅ Hoàn thành!`);
    console.log(`📊 Sau khi xóa:`);
    console.log(`   - Sales: ${afterStats?.salesCount || 0} đơn hàng`);
    console.log(`   - SalesItems: ${afterStats?.itemsCount || 0} items`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

clearSalesData();
