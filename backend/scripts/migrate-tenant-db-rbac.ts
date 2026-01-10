/**
 * Combined Migration Script: Update Tenant Database for Multi-tenant RBAC
 * 
 * This script runs all migrations needed to update the Tenant Database schema
 * for the Multi-tenant RBAC system:
 * 
 * 1. Update Users table - Add/migrate role column to new RBAC roles
 * 2. Update UserStores table - Add RoleOverride and PermissionsOverride columns
 * 3. Create Permissions table - For custom permissions per user per module
 * 
 * Usage: npx tsx scripts/migrate-tenant-db-rbac.ts
 */

import 'dotenv/config';
import { query, queryOne } from '../src/db';

// New role enum values
const NEW_ROLES = ['owner', 'company_manager', 'store_manager', 'salesperson'] as const;
type NewRole = typeof NEW_ROLES[number];

// Role mapping from old to new
const ROLE_MAPPING: Record<string, NewRole> = {
  'admin': 'owner',
  'accountant': 'company_manager',
  'inventory_manager': 'store_manager',
  'salesperson': 'salesperson',
  'custom': 'salesperson',
};

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

async function createIndexIfNotExists(indexName: string, tableName: string, columns: string): Promise<void> {
  try {
    const indexExists = await queryOne<{ count: number }>(`
      SELECT COUNT(*) as count FROM sys.indexes WHERE name = @name
    `, { name: indexName });
    
    if ((indexExists?.count ?? 0) === 0) {
      await query(`CREATE INDEX ${indexName} ON ${tableName}(${columns})`);
      console.log(`     ✅ Created index ${indexName}`);
    } else {
      console.log(`     ℹ️  Index ${indexName} already exists`);
    }
  } catch (error) {
    console.log(`     ⚠️  Could not create index ${indexName}`);
  }
}

// ============================================
// Migration 1: Update Users table roles
// ============================================
async function migrateUserRoles(): Promise<void> {
  console.log('\n📋 Migration 1: Updating Users table roles...\n');

  // Check current role column
  const hasRoleColumn = await checkColumnExists('Users', 'Role');
  
  if (!hasRoleColumn) {
    console.log('   ⚠️  Role column does not exist. Creating it...');
    await query(`ALTER TABLE Users ADD Role NVARCHAR(50) NOT NULL DEFAULT 'salesperson'`);
    console.log('   ✅ Role column created');
  }

  // Get current users and their roles
  const users = await query<{ id: string; email: string; role: string }>(`
    SELECT Id as id, Email as email, Role as role FROM Users
  `);
  
  console.log(`   Found ${users.length} users`);
  
  let migratedCount = 0;
  let skippedCount = 0;
  
  for (const user of users) {
    const oldRole = user.role?.toLowerCase() || 'salesperson';
    
    // Check if role already matches new format
    if (NEW_ROLES.includes(oldRole as NewRole)) {
      skippedCount++;
      continue;
    }
    
    const newRole = ROLE_MAPPING[oldRole] || 'salesperson';
    
    // Update role
    await query(`UPDATE Users SET Role = @newRole, UpdatedAt = GETDATE() WHERE Id = @id`, 
      { id: user.id, newRole });
    
    console.log(`   ✅ ${user.email}: ${oldRole} -> ${newRole}`);
    migratedCount++;
  }
  
  console.log(`\n   Migrated: ${migratedCount} users`);
  console.log(`   Skipped (already new format): ${skippedCount} users`);
}

// ============================================
// Migration 2: Update UserStores table
// ============================================
async function migrateUserStoresTable(): Promise<void> {
  console.log('\n📋 Migration 2: Updating UserStores table...\n');

  const tableExists = await checkTableExists('UserStores');
  
  if (!tableExists) {
    console.log('   Creating UserStores table...');
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
    // Add columns if they don't exist
    const columnsToAdd = [
      { name: 'RoleOverride', type: 'NVARCHAR(50) NULL' },
      { name: 'PermissionsOverride', type: 'NVARCHAR(MAX) NULL' },
      { name: 'UpdatedAt', type: 'DATETIME2 NULL DEFAULT GETDATE()' },
    ];
    
    for (const col of columnsToAdd) {
      const exists = await checkColumnExists('UserStores', col.name);
      if (!exists) {
        await query(`ALTER TABLE UserStores ADD ${col.name} ${col.type}`);
        console.log(`   ✅ Added column ${col.name}`);
      } else {
        console.log(`   ℹ️  Column ${col.name} already exists`);
      }
    }
  }

  // Create indexes
  console.log('   Creating indexes...');
  await createIndexIfNotExists('IX_UserStores_UserId', 'UserStores', 'UserId');
  await createIndexIfNotExists('IX_UserStores_StoreId', 'UserStores', 'StoreId');
  await createIndexIfNotExists('IX_UserStores_RoleOverride', 'UserStores', 'RoleOverride');
}

// ============================================
// Migration 3: Create Permissions table
// ============================================
async function createPermissionsTable(): Promise<void> {
  console.log('\n📋 Migration 3: Creating Permissions table...\n');

  const tableExists = await checkTableExists('Permissions');
  
  if (!tableExists) {
    console.log('   Creating Permissions table...');
    await query(`
      CREATE TABLE Permissions (
        Id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
        UserId NVARCHAR(36) NOT NULL,
        Module NVARCHAR(100) NOT NULL,
        Actions NVARCHAR(255) NOT NULL,
        StoreId NVARCHAR(36) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_Permissions_Users FOREIGN KEY (UserId) 
          REFERENCES Users(Id) ON DELETE CASCADE,
        CONSTRAINT FK_Permissions_Stores FOREIGN KEY (StoreId) 
          REFERENCES Stores(Id) ON DELETE CASCADE,
        CONSTRAINT UQ_Permissions_User_Module_Store UNIQUE (UserId, Module, StoreId)
      )
    `);
    console.log('   ✅ Permissions table created');
  } else {
    console.log('   ℹ️  Permissions table already exists');
  }

  // Create indexes
  console.log('   Creating indexes...');
  await createIndexIfNotExists('IX_Permissions_UserId', 'Permissions', 'UserId');
  await createIndexIfNotExists('IX_Permissions_StoreId', 'Permissions', 'StoreId');
  await createIndexIfNotExists('IX_Permissions_Module', 'Permissions', 'Module');
  await createIndexIfNotExists('IX_Permissions_User_Store', 'Permissions', 'UserId, StoreId');
}

// ============================================
// Main migration function
// ============================================
async function runMigrations(): Promise<void> {
  console.log('🚀 Starting Tenant Database RBAC Migrations...');
  console.log('================================================\n');

  try {
    // Run migrations in order
    await migrateUserRoles();
    await migrateUserStoresTable();
    await createPermissionsTable();

    // Verify final state
    console.log('\n================================================');
    console.log('📊 Verifying final database state...\n');

    // Check Users table
    const userRoles = await query<{ role: string; count: number }>(`
      SELECT Role as role, COUNT(*) as count FROM Users GROUP BY Role
    `);
    console.log('Users table role distribution:');
    for (const row of userRoles) {
      const isValid = NEW_ROLES.includes(row.role as NewRole);
      console.log(`  ${isValid ? '✅' : '⚠️'} ${row.role}: ${row.count} users`);
    }

    // Check UserStores columns
    const userStoresCols = await query<{ COLUMN_NAME: string }>(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'UserStores'
    `);
    console.log('\nUserStores table columns:');
    console.log(`  ${userStoresCols.map(c => c.COLUMN_NAME).join(', ')}`);

    // Check Permissions table
    const permissionsCols = await query<{ COLUMN_NAME: string }>(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Permissions'
    `);
    console.log('\nPermissions table columns:');
    console.log(`  ${permissionsCols.map(c => c.COLUMN_NAME).join(', ')}`);

    console.log('\n================================================');
    console.log('✅ All migrations completed successfully!\n');
    console.log('New RBAC roles: owner, company_manager, store_manager, salesperson');
    console.log('UserStores now supports: RoleOverride, PermissionsOverride');
    console.log('Permissions table ready for custom per-user permissions');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migrations
runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
