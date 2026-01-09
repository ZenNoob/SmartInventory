import * as sql from 'mssql';
import * as dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'Data_QuanLyBanHang_Online',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function createPaymentsTable() {
  let pool: sql.ConnectionPool | null = null;
  
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected!\n');

    // Check if Payments table exists
    const tableExists = await pool.request().query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Payments'
    `);

    if (tableExists.recordset[0].count === 0) {
      console.log('Creating Payments table...');
      await pool.request().query(`
        CREATE TABLE Payments (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          store_id UNIQUEIDENTIFIER NOT NULL,
          customer_id UNIQUEIDENTIFIER NOT NULL,
          amount DECIMAL(18, 2) NOT NULL,
          payment_date DATETIME2 NOT NULL DEFAULT GETDATE(),
          notes NVARCHAR(500) NULL,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          FOREIGN KEY (customer_id) REFERENCES Customers(id)
        )
      `);
      console.log('✅ Payments table created successfully!');
    } else {
      console.log('⏭️ Payments table already exists');
    }

    // Add credit_limit column to Customers if not exists
    const creditLimitExists = await pool.request().query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Customers' AND COLUMN_NAME = 'credit_limit'
    `);

    if (creditLimitExists.recordset[0].count === 0) {
      console.log('Adding credit_limit column to Customers...');
      await pool.request().query(`
        ALTER TABLE Customers ADD credit_limit DECIMAL(18, 2) DEFAULT 0
      `);
      console.log('✅ credit_limit column added!');
    } else {
      console.log('⏭️ credit_limit column already exists');
    }

    console.log('\n✅ Database setup complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

createPaymentsTable();
