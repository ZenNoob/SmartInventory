/**
 * Add unit_id column to Products table
 */

import 'dotenv/config';
import { getConnection, closeConnection, sql } from '../src/db/index.js';

async function addUnitIdColumn() {
  console.log('🚀 Adding unit_id column to Products table...\n');

  try {
    const pool = await getConnection();
    console.log('✅ Connected to SQL Server\n');

    // Check if column already exists
    const checkColumn = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Products' AND COLUMN_NAME = 'unit_id'
    `);

    if (checkColumn.recordset[0].count > 0) {
      console.log('ℹ️  Column unit_id already exists in Products table');
    } else {
      // Add unit_id column
      await pool.request().query(`
        ALTER TABLE Products 
        ADD unit_id UNIQUEIDENTIFIER NULL
      `);
      console.log('✅ Added unit_id column to Products table');

      // Get the first unit for each store and update products
      const stores = await pool.request().query('SELECT DISTINCT id FROM Stores WHERE status = \'active\'');
      
      for (const store of stores.recordset) {
        const storeId = store.id;
        
        // Get first unit for this store
        const units = await pool.request()
          .input('storeId', sql.UniqueIdentifier, storeId)
          .query('SELECT TOP 1 id FROM Units WHERE store_id = @storeId');
        
        if (units.recordset.length > 0) {
          const unitId = units.recordset[0].id;
          
          // Update products without unit_id
          const result = await pool.request()
            .input('storeId', sql.UniqueIdentifier, storeId)
            .input('unitId', sql.UniqueIdentifier, unitId)
            .query('UPDATE Products SET unit_id = @unitId WHERE store_id = @storeId AND unit_id IS NULL');
          
          console.log(`✅ Updated ${result.rowsAffected[0]} products for store ${storeId}`);
        }
      }
    }

    await closeConnection();
    console.log('\n✅ Migration completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addUnitIdColumn();
