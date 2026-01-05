import { getConnection, closeConnection } from '../src/lib/db';

async function check() {
  const pool = await getConnection();
  
  const storeOwners = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'StoreOwners'
  `);
  console.log('StoreOwners table structure:');
  console.log(JSON.stringify(storeOwners.recordset, null, 2));
  
  const existingOwners = await pool.request().query('SELECT * FROM StoreOwners');
  console.log('\nExisting StoreOwners:');
  console.log(JSON.stringify(existingOwners.recordset, null, 2));
  
  await closeConnection();
}

check();
