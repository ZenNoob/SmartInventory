/**
 * Migration Script: Update UserStores table for Multi-tenant RBAC
 * 
 * This script updates the UserStores table to support:
 * - role_override: Allow custom role per store (e.g., user is store_manager in one store, salesperson in another)
 * - permissions_override: JSON field for custom permissions per user per store
 * 
 * Usage: npx tsx scripts/migrate-userstores-rbac.ts
 */

import 'dotenv/config';
import { query, queryOne } from '../src/db';

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await queryOne<{ count: number }>(`
    SELECT COUNT(*) as count 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = @tableName AND COLUMN_NAME = @columnName
  `, { tableName, columnName });
  return (result?.count ?? 0) > 0;
}

async function checkTableExists(tableName: string): Promise<boolean> {
  const result = await queryOne<{ count: number }>(`
    SELECT COUNT(*) as count 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME = @tableName
  `, { tableName });
  return (result?.count ?? 0) > 0;
}

async function migrateUserStoresTable(): Promise<void> {
  console.log('🚀 Starting UserStores Migration for Multi-tenant RBAC...\n');

  try {
    // Step 1: Check if UserStores table exists
    console.log('📋 Step 1: Checking UserStores table...');
    const tableExists = await checkTableExists('UserStores');
    
    if (!tableExists) {
      console.log('   ⚠️  UserStores table does not exist. Creating it...');
      await query(`
        CREATE TABLE UserStores (
          Id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
          UserId NVARCHAR(36) NOT NULL,
          StoreId NVARCHAR(36) NOT NULL,
          RoleOverride NVARCHAR(50) NULL,
          PermissionsOverride NVARCHAR(MAX) NULL,
          CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
          UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
          CONSTRAINT FK_UserStores_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
          CONSTRAINT FK_UserStores_Stores FOREIGN KEY (StoreId) REFERENCES Stores(Id) ON DELETE CASCADE,
          CONSTRAINT UQ_UserStores_User_Store UNIQUE (UserId, StoreId)
        )
      `);
      console.log('   ✅ UserStores table created');
    } else {
      console.log('   ✅ UserStores table exists');
    }

    // Step 2: Add RoleOverride column if not exists
    console.log('\n📋 Step 2: Adding RoleOverride column...');
    const hasRoleOverride = await checkColumnExists('UserStores', 'RoleOverride');
    
    if (!hasRoleOverride) {
      await query(`
        ALTER TABLE UserStores ADD RoleOverride NVARCHAR(50) NULL
      `);
      console.log('   ✅ RoleOverride column added');
    } else {
      console.log('   ℹ️  RoleOverride column already exists');
    }

    // Step 3: Add PermissionsOverride column if not exists
    console.log('\n📋 Step 3: Adding PermissionsOverride column...');
    const hasPermissionsOverride = await checkColumnExists('UserStores', 'PermissionsOverride');
    
    if (!hasPermissionsOverride) {
      await query(`
        ALTER TABLE UserStores ADD PermissionsOverride NVARCHAR(MAX) NULL
      `);
      console.log('   ✅ PermissionsOverride column added');
    } else {
      console.log('   ℹ️  PermissionsOverride column already exists');
    }

    // Step 4: Add UpdatedAt column if not exists
    console.log('\n📋 Step 4: Adding UpdatedAt column...');
    const hasUpdatedAt = await checkColumnExists('UserStores', 'UpdatedAt');
    
    if (!hasUpdatedAt) {
      await query(`
        ALTER TABLE UserStores ADD UpdatedAt DATETIME2 NULL DEFAULT GETDATE()
      `);
      console.log('   ✅ UpdatedAt column added');
    } else {
      console.log('   ℹ️  UpdatedAt column already exists');
    }

    // Step 5: Migrate old 'role' column to 'RoleOverride' if exists
    console.log('\n📋 Step 5: Checking for old role column migration...');
    const hasOldRole = await checkColumnExists('UserStores', 'role');
    
    if (hasOldRole && hasRoleOverride === false) {
      // Copy data from old column to new column
      await query(`
        UPDATE UserStores SET RoleOverride = role WHERE role IS NOT NULL
      `);
      console.log('   ✅ Migrated data from role to RoleOverride');
      
      // Drop old column
      await query(`
        ALTER TABLE UserStores DROP COLUMN role
      `);
      console.log('   ✅ Dropped old role column');
    } else if (hasOldRole) {
      console.log('   ℹ️  Old role column exists but RoleOverride already has data');
    } else {
      console.log('   ℹ️  No old role column to migrate');
    }

    // Step 6: Create indexes for performance
    console.log('\n📋 Step 6: Creating indexes...');
    
    const indexes = [
      { name: 'IX_UserStores_UserId', columns: 'UserId' },
      { name: 'IX_UserStores_StoreId', columns: 'StoreId' },
      { name: 'IX_UserStores_RoleOverride', columns: 'RoleOverride' },
    ];
    
    for (const index of indexes) {
      try {
        const indexExists = await queryOne<{ count: number }>(`
          SELECT COUNT(*) as count FROM sys.indexes WHERE name = @name
        `, { name: index.name });
        
        if ((indexExists?.count ?? 0) === 0) {
          await query(`
            CREATE INDEX ${index.name} ON UserStores(${index.columns})
          `);
          console.log(`   ✅ Created index ${index.name}`);
        } else {
          console.log(`   ℹ️  Index ${index.name} already exists`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not create index ${index.name}`);
      }
    }

    // Step 7: Verify final schema
    console.log('\n📋 Step 7: Verifying final schema...');
    const columns = await query<{ COLUMN_NAME: string; DATA_TYPE: string; IS_NULLABLE: string }>(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'UserStores' 
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('   UserStores table schema:');
    for (const col of columns) {
      console.log(`     - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'nullable' : 'required'})`);
    }

    console.log('\n✅ UserStores migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateUserStoresTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
