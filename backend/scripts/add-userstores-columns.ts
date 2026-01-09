import 'dotenv/config';
import { query } from '../src/db';

async function addUserStoresColumns() {
  console.log('🔧 Thêm các cột mới vào bảng UserStores...\n');

  try {
    // Kiểm tra và thêm cột role
    console.log('📝 Thêm cột role...');
    await query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_NAME = 'UserStores' AND COLUMN_NAME = 'role')
      BEGIN
        ALTER TABLE UserStores ADD role NVARCHAR(50) NULL DEFAULT 'staff'
      END
    `);
    console.log('   ✅ Cột role đã được thêm');

    // Kiểm tra và thêm cột updated_at
    console.log('📝 Thêm cột updated_at...');
    await query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_NAME = 'UserStores' AND COLUMN_NAME = 'updated_at')
      BEGIN
        ALTER TABLE UserStores ADD updated_at DATETIME2 NULL DEFAULT GETDATE()
      END
    `);
    console.log('   ✅ Cột updated_at đã được thêm');

    // Kiểm tra lại schema
    const columns = await query<{ COLUMN_NAME: string }>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'UserStores' ORDER BY ORDINAL_POSITION`
    );
    
    console.log('\n✅ Hoàn thành! Schema bảng UserStores:');
    console.log(columns.map(c => c.COLUMN_NAME).join(', '));

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

addUserStoresColumns();
