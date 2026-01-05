import sql from 'mssql';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
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

async function fixUserStores() {
  let pool: sql.ConnectionPool | null = null;
  
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected!\n');

    // Get all users
    const usersResult = await pool.request().query(`
      SELECT id, email, display_name, role FROM Users
    `);
    console.log('Users in database:');
    console.table(usersResult.recordset);

    // Get all stores
    const storesResult = await pool.request().query(`
      SELECT id, name, slug, owner_id FROM Stores
    `);
    console.log('\nStores in database:');
    console.table(storesResult.recordset);

    // Get UserStores relationships
    const userStoresResult = await pool.request().query(`
      SELECT us.user_id, us.store_id, u.email, s.name as store_name
      FROM UserStores us
      JOIN Users u ON us.user_id = u.id
      JOIN Stores s ON us.store_id = s.id
    `);
    console.log('\nUserStores relationships:');
    console.table(userStoresResult.recordset);

    // Check for users without stores
    const usersWithoutStores = await pool.request().query(`
      SELECT u.id, u.email, u.display_name
      FROM Users u
      WHERE NOT EXISTS (
        SELECT 1 FROM UserStores us WHERE us.user_id = u.id
      )
    `);

    if (usersWithoutStores.recordset.length > 0) {
      console.log('\n⚠️ Users WITHOUT any store assigned:');
      console.table(usersWithoutStores.recordset);

      // If there's a default store, assign users to it
      if (storesResult.recordset.length > 0) {
        const defaultStore = storesResult.recordset[0];
        console.log(`\nAssigning users to default store: ${defaultStore.name} (${defaultStore.id})`);

        for (const user of usersWithoutStores.recordset) {
          // Check if relationship already exists
          const existingResult = await pool.request()
            .input('userId', sql.NVarChar, user.id)
            .input('storeId', sql.NVarChar, defaultStore.id)
            .query(`
              SELECT 1 FROM UserStores WHERE user_id = @userId AND store_id = @storeId
            `);

          if (existingResult.recordset.length === 0) {
            await pool.request()
              .input('userId', sql.NVarChar, user.id)
              .input('storeId', sql.NVarChar, defaultStore.id)
              .query(`
                INSERT INTO UserStores (user_id, store_id, role, created_at)
                VALUES (@userId, @storeId, 'admin', GETDATE())
              `);
            console.log(`✅ Assigned user ${user.email} to store ${defaultStore.name}`);
          }
        }
      }
    } else {
      console.log('\n✅ All users have at least one store assigned.');
    }

    // Verify final state
    console.log('\n--- Final UserStores state ---');
    const finalResult = await pool.request().query(`
      SELECT us.user_id, us.store_id, u.email, s.name as store_name, us.role
      FROM UserStores us
      JOIN Users u ON us.user_id = u.id
      JOIN Stores s ON us.store_id = s.id
    `);
    console.table(finalResult.recordset);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

fixUserStores();
