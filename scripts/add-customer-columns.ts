import sql from 'mssql';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const config: sql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'Data_QuanLyBanHang_Online',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function addCustomerColumns() {
  let pool: sql.ConnectionPool | null = null;
  
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected!\n');

    // Check existing columns
    const existingColumns = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Customers'
    `);
    const columnNames = existingColumns.recordset.map(r => r.COLUMN_NAME);
    console.log('Existing columns:', columnNames);

    // Add missing columns
    const columnsToAdd = [
      { name: 'status', type: "NVARCHAR(20) DEFAULT 'active'" },
      { name: 'loyalty_tier', type: 'NVARCHAR(50) NULL' },
      { name: 'customer_type', type: "NVARCHAR(50) DEFAULT 'individual'" },
      { name: 'customer_group', type: 'NVARCHAR(100) NULL' },
      { name: 'lifetime_points', type: 'INT DEFAULT 0' },
      { name: 'notes', type: 'NVARCHAR(MAX) NULL' },
    ];

    for (const col of columnsToAdd) {
      if (!columnNames.includes(col.name)) {
        console.log(`Adding column: ${col.name}`);
        await pool.request().query(`ALTER TABLE Customers ADD ${col.name} ${col.type}`);
        console.log(`✅ Added ${col.name}`);
      } else {
        console.log(`⏭️ Column ${col.name} already exists`);
      }
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

addCustomerColumns();
