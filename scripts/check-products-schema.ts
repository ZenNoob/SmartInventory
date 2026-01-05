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

async function checkSchema() {
  let pool: sql.ConnectionPool | null = null;
  
  try {
    pool = await sql.connect(config);
    
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Products'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Products table columns:');
    console.table(result.recordset);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkSchema();
