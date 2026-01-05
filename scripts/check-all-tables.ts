import { getConnection, closeConnection } from '../src/lib/db';

async function checkTables() {
  const pool = await getConnection();
  
  const tables = ['Categories', 'Customers', 'Products', 'Orders', 'OrderItems', 'Stores', 'Users', 'Units', 'Sales', 'Suppliers'];
  
  for (const table of tables) {
    try {
      const result = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${table}'
        ORDER BY ORDINAL_POSITION
      `);
      
      if (result.recordset.length > 0) {
        console.log(`\n=== ${table} ===`);
        result.recordset.forEach(col => {
          console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''}`);
        });
      }
    } catch (e) {
      // Table doesn't exist
    }
  }
  
  await closeConnection();
}

checkTables();
