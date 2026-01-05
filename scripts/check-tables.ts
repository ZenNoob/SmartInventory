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

async function checkTables() {
  let pool: sql.ConnectionPool | null = null;
  
  try {
    pool = await sql.connect(config);
    
    // Check if CashTransactions table exists
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE '%Cash%' OR TABLE_NAME LIKE '%cash%'
    `);
    console.log('Cash-related tables:', tablesResult.recordset);

    // Check CashTransactions schema if exists
    const schemaResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'CashTransactions'
      ORDER BY ORDINAL_POSITION
    `);
    
    if (schemaResult.recordset.length > 0) {
      console.log('\nCashTransactions columns:');
      console.table(schemaResult.recordset);
    } else {
      console.log('\nCashTransactions table does not exist. Creating...');
      
      await pool.request().query(`
        CREATE TABLE CashTransactions (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          store_id UNIQUEIDENTIFIER NOT NULL,
          type NVARCHAR(10) NOT NULL CHECK (type IN ('thu', 'chi')),
          transaction_date DATETIME2 NOT NULL,
          amount DECIMAL(18, 2) NOT NULL,
          reason NVARCHAR(500) NOT NULL,
          category NVARCHAR(100) NULL,
          related_invoice_id UNIQUEIDENTIFIER NULL,
          created_by UNIQUEIDENTIFIER NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
        )
      `);
      console.log('CashTransactions table created!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkTables();
