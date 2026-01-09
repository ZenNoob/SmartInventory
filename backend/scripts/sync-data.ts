import sql from 'mssql';
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

async function syncData() {
  console.log('🔄 Đồng bộ dữ liệu...\n');
  
  const pool = await sql.connect(config);
  
  try {
    // 1. Xóa các cửa hàng trùng lặp (không có users)
    console.log('1️⃣ Xóa cửa hàng trùng lặp không có users...');
    
    const duplicateStores = await pool.request().query(`
      SELECT s.id, s.name, s.slug
      FROM Stores s
      WHERE NOT EXISTS (SELECT 1 FROM UserStores us WHERE us.store_id = s.id)
    `);
    
    for (const store of duplicateStores.recordset) {
      console.log(`   Xóa: ${store.name} (${store.slug})`);
      // Xóa StoreShiftConfig trước
      await pool.request()
        .input('id', sql.UniqueIdentifier, store.id)
        .query('DELETE FROM StoreShiftConfig WHERE store_id = @id');
      await pool.request()
        .input('id', sql.UniqueIdentifier, store.id)
        .query('DELETE FROM Stores WHERE id = @id');
    }
    console.log(`   ✅ Đã xóa ${duplicateStores.recordset.length} cửa hàng trùng\n`);
    
    // 2. Gán user Phat vào các cửa hàng
    console.log('2️⃣ Gán user Phat vào các cửa hàng...');
    
    const phatUser = await pool.request()
      .input('email', sql.NVarChar, 'Phat@lhu.edu.vn')
      .query('SELECT id FROM Users WHERE email = @email');
    
    if (phatUser.recordset.length > 0) {
      const phatId = phatUser.recordset[0].id;
      
      const stores = await pool.request().query('SELECT id, name FROM Stores WHERE status = \'active\'');
      
      for (const store of stores.recordset) {
        // Kiểm tra xem đã có chưa
        const existing = await pool.request()
          .input('userId', sql.UniqueIdentifier, phatId)
          .input('storeId', sql.UniqueIdentifier, store.id)
          .query('SELECT 1 FROM UserStores WHERE user_id = @userId AND store_id = @storeId');
        
        if (existing.recordset.length === 0) {
          await pool.request()
            .input('userId', sql.UniqueIdentifier, phatId)
            .input('storeId', sql.UniqueIdentifier, store.id)
            .query(`
              INSERT INTO UserStores (user_id, store_id, role, created_at, updated_at)
              VALUES (@userId, @storeId, 'staff', GETDATE(), GETDATE())
            `);
          console.log(`   ✅ Gán Phat vào ${store.name} (staff)`);
        }
      }
    }
    
    // 3. Kiểm tra lại
    console.log('\n3️⃣ Kết quả sau đồng bộ:');
    
    const finalStores = await pool.request().query(`
      SELECT s.id, s.name, s.slug, s.status,
             (SELECT COUNT(*) FROM UserStores WHERE store_id = s.id) as users
      FROM Stores s
      ORDER BY s.name
    `);
    console.log('\n📦 Cửa hàng:');
    console.table(finalStores.recordset);
    
    const finalUserStores = await pool.request().query(`
      SELECT u.email, s.name as store_name, us.role
      FROM UserStores us
      JOIN Users u ON us.user_id = u.id
      JOIN Stores s ON us.store_id = s.id
      ORDER BY u.email, s.name
    `);
    console.log('\n👥 User-Store:');
    console.table(finalUserStores.recordset);
    
    console.log('\n🎉 Đồng bộ hoàn tất!');
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await pool.close();
  }
}

syncData();
