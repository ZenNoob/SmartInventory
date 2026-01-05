import { getConnection, closeConnection } from '../src/lib/db';

async function checkStores() {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Stores'
  `);
  console.log('Stores table structure:');
  console.log(JSON.stringify(result.recordset, null, 2));
  
  const customers = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Customers'
  `);
  console.log('\nCustomers table structure:');
  console.log(JSON.stringify(customers.recordset, null, 2));
  
  const products = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Products'
  `);
  console.log('\nProducts table structure:');
  console.log(JSON.stringify(products.recordset, null, 2));
  
  await closeConnection();
}

checkStores();
