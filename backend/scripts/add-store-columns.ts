import 'dotenv/config';
import { query } from '../src/db';

async function addStoreColumns() {
  console.log('🔧 Thêm các cột mới vào bảng Stores...\n');

  try {
    // Kiểm tra và thêm cột address
    console.log('📝 Thêm cột address...');
    await query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_NAME = 'Stores' AND COLUMN_NAME = 'address')
      BEGIN
        ALTER TABLE Stores ADD address NVARCHAR(500) NULL
      END
    `);
    console.log('   ✅ Cột address đã được thêm');

    // Kiểm tra và thêm cột phone
    console.log('📝 Thêm cột phone...');
    await query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_NAME = 'Stores' AND COLUMN_NAME = 'phone')
      BEGIN
        ALTER TABLE Stores ADD phone NVARCHAR(20) NULL
      END
    `);
    console.log('   ✅ Cột phone đã được thêm');

    // Kiểm tra và thêm cột business_type
    console.log('📝 Thêm cột business_type...');
    await query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_NAME = 'Stores' AND COLUMN_NAME = 'business_type')
      BEGIN
        ALTER TABLE Stores ADD business_type NVARCHAR(100) NULL
      END
    `);
    console.log('   ✅ Cột business_type đã được thêm');

    // Kiểm tra lại schema
    const columns = await query<{ COLUMN_NAME: string }>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stores' ORDER BY ORDINAL_POSITION`
    );
    
    console.log('\n✅ Hoàn thành! Schema bảng Stores:');
    console.log(columns.map(c => c.COLUMN_NAME).join(', '));

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

addStoreColumns();
