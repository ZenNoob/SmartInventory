import { getConnection, closeConnection, sql } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth/password';
import { v4 as uuidv4 } from 'uuid';

async function createDefaultStore() {
  console.log('🏪 Setting up store...\n');
  
  try {
    const pool = await getConnection();
    
    // Check if any store owner exists
    const existingOwners = await pool.request().query('SELECT id FROM StoreOwners');
    
    let ownerId: string;
    
    if (existingOwners.recordset.length === 0) {
      // Create store owner
      ownerId = uuidv4();
      const passwordHash = await hashPassword('admin123');
      
      await pool.request()
        .input('id', sql.UniqueIdentifier, ownerId)
        .input('email', sql.NVarChar, 'owner@smartinventory.com')
        .input('passwordHash', sql.NVarChar, passwordHash)
        .input('fullName', sql.NVarChar, 'Store Owner')
        .query(`
          INSERT INTO StoreOwners (id, email, password_hash, full_name, created_at, updated_at)
          VALUES (@id, @email, @passwordHash, @fullName, GETDATE(), GETDATE())
        `);
      console.log('  ✅ Store owner created');
    } else {
      ownerId = existingOwners.recordset[0].id;
      console.log('  ℹ️ Store owner already exists');
    }

    // Check if any store exists
    const existingStores = await pool.request().query('SELECT id FROM Stores');
    
    let storeId: string;
    
    if (existingStores.recordset.length === 0) {
      // Create default store
      storeId = uuidv4();
      await pool.request()
        .input('id', sql.UniqueIdentifier, storeId)
        .input('ownerId', sql.UniqueIdentifier, ownerId)
        .input('name', sql.NVarChar, 'Cửa hàng mặc định')
        .input('slug', sql.NVarChar, 'default-store')
        .input('status', sql.NVarChar, 'active')
        .query(`
          INSERT INTO Stores (id, owner_id, name, slug, status, created_at, updated_at)
          VALUES (@id, @ownerId, @name, @slug, @status, GETDATE(), GETDATE())
        `);
      console.log('  ✅ Default store created');
    } else {
      storeId = existingStores.recordset[0].id;
      console.log('  ℹ️ Store already exists');
    }

    // Link all users to the store
    const users = await pool.request().query('SELECT id FROM Users');
    console.log(`\n👤 Linking ${users.recordset.length} user(s) to store...\n`);
    
    for (const user of users.recordset) {
      const existingLink = await pool.request()
        .input('userId', sql.UniqueIdentifier, user.id)
        .input('storeId', sql.UniqueIdentifier, storeId)
        .query('SELECT id FROM UserStores WHERE user_id = @userId AND store_id = @storeId');
      
      if (existingLink.recordset.length === 0) {
        await pool.request()
          .input('id', sql.UniqueIdentifier, uuidv4())
          .input('userId', sql.UniqueIdentifier, user.id)
          .input('storeId', sql.UniqueIdentifier, storeId)
          .query('INSERT INTO UserStores (id, user_id, store_id) VALUES (@id, @userId, @storeId)');
        console.log(`  ✅ User linked to store`);
      } else {
        console.log(`  ℹ️ User already linked`);
      }
    }

    await closeConnection();
    console.log('\n✅ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

createDefaultStore();
