/**
 * Script to check and fix user store access
 * 
 * This script:
 * 1. Lists all users and their assigned stores
 * 2. Optionally assigns all stores to users without any store assignment
 */

import sql from 'mssql';

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'SmartInventory',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function main() {
  const pool = await sql.connect(config);
  console.log('Connected to database');

  // Get all users with their roles
  const users = await pool.request().query(`
    SELECT u.id, u.email, u.display_name, u.role, u.status
    FROM Users u
    WHERE u.status = 'active'
    ORDER BY u.role, u.email
  `);

  console.log('\n=== Users ===');
  for (const user of users.recordset) {
    console.log(`\n${user.email} (${user.role})`);
    
    // Get assigned stores for this user
    const stores = await pool.request()
      .input('userId', sql.UniqueIdentifier, user.id)
      .query(`
        SELECT s.Id, s.Name, s.Slug
        FROM UserStores us
        INNER JOIN Stores s ON us.StoreId = s.Id
        WHERE us.UserId = @userId
      `);

    if (stores.recordset.length === 0) {
      console.log('  ⚠️  No stores assigned');
      
      // For store_manager and salesperson, this is a problem
      if (user.role === 'store_manager' || user.role === 'salesperson') {
        console.log('  → This user needs store assignment to access the system');
        
        // Get all active stores
        const allStores = await pool.request().query(`
          SELECT Id, Name FROM Stores WHERE Status = 'active'
        `);
        
        if (allStores.recordset.length > 0) {
          // Assign first store to user
          const firstStore = allStores.recordset[0];
          console.log(`  → Auto-assigning store: ${firstStore.Name}`);
          
          await pool.request()
            .input('userId', sql.UniqueIdentifier, user.id)
            .input('storeId', sql.UniqueIdentifier, firstStore.Id)
            .query(`
              IF NOT EXISTS (SELECT 1 FROM UserStores WHERE UserId = @userId AND StoreId = @storeId)
              INSERT INTO UserStores (UserId, StoreId, CreatedAt)
              VALUES (@userId, @storeId, GETDATE())
            `);
          
          console.log('  ✅ Store assigned successfully');
        }
      }
    } else {
      console.log('  Assigned stores:');
      for (const store of stores.recordset) {
        console.log(`    - ${store.Name} (${store.Slug})`);
      }
    }
  }

  // Get all stores
  console.log('\n=== All Stores ===');
  const allStores = await pool.request().query(`
    SELECT Id, Name, Slug, Status FROM Stores ORDER BY Name
  `);
  
  for (const store of allStores.recordset) {
    console.log(`${store.Name} (${store.Slug}) - ${store.Status}`);
  }

  await pool.close();
  console.log('\nDone!');
}

main().catch(console.error);
