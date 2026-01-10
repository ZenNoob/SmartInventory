/**
 * Migration Script: Update User Roles for Multi-tenant RBAC
 * 
 * This script migrates existing user roles to the new RBAC hierarchy:
 * - owner: Full access to all stores and features
 * - company_manager: All stores, no user management
 * - store_manager: Assigned stores only, full store-level features
 * - salesperson: POS and basic sales only
 * 
 * Role mapping from old to new:
 * - admin -> owner
 * - accountant -> company_manager
 * - inventory_manager -> store_manager
 * - salesperson -> salesperson
 * - custom -> salesperson (with existing permissions preserved)
 * 
 * Usage: npx tsx scripts/migrate-user-roles.ts
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
  'custom': 'salesperson', // Custom roles default to salesperson, permissions preserved
};

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await queryOne<{ count: number }>(`
    SELECT COUNT(*) as count 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = @tableName AND COLUMN_NAME = @columnName
  `, { tableName, columnName });
  return (result?.count ?? 0) > 0;
}

async function migrateUserRoles(): Promise<void> {
  console.log('🚀 Starting User Roles Migration for Multi-tenant RBAC...\n');

  try {
    // Step 1: Check current role column
    console.log('📋 Step 1: Checking current Users table schema...');
    const hasRoleColumn = await checkColumnExists('Users', 'Role');
    
    if (!hasRoleColumn) {
      console.log('   ⚠️  Role column does not exist. Creating it...');
      await query(`
        ALTER TABLE Users ADD Role NVARCHAR(50) NOT NULL DEFAULT 'salesperson'
      `);
      console.log('   ✅ Role column created with default value "salesperson"');
    } else {
      console.log('   ✅ Role column exists');
    }

    // Step 2: Get current users and their roles
    console.log('\n📋 Step 2: Analyzing current user roles...');
    const users = await query<{ id: string; email: string; role: string }>(`
      SELECT id, email, Role as role FROM Users
    `);
    
    console.log(`   Found ${users.length} users`);
    
    // Count roles
    const roleCounts: Record<string, number> = {};
    for (const user of users) {
      const role = user.role || 'unknown';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }
    
    console.log('   Current role distribution:');
    for (const [role, count] of Object.entries(roleCounts)) {
      console.log(`     - ${role}: ${count} users`);
    }

    // Step 3: Migrate roles
    console.log('\n📋 Step 3: Migrating user roles...');
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      const oldRole = user.role?.toLowerCase() || 'salesperson';
      const newRole = ROLE_MAPPING[oldRole] || 'salesperson';
      
      // Check if role already matches new format
      if (NEW_ROLES.includes(oldRole as NewRole)) {
        skippedCount++;
        continue;
      }
      
      // Update role
      await query(`
        UPDATE Users SET Role = @newRole, UpdatedAt = GETDATE() WHERE id = @id
      `, { id: user.id, newRole });
      
      console.log(`   ✅ ${user.email}: ${oldRole} -> ${newRole}`);
      migratedCount++;
    }
    
    console.log(`\n   Migrated: ${migratedCount} users`);
    console.log(`   Skipped (already new format): ${skippedCount} users`);

    // Step 4: Verify migration
    console.log('\n📋 Step 4: Verifying migration...');
    const updatedUsers = await query<{ role: string; count: number }>(`
      SELECT Role as role, COUNT(*) as count FROM Users GROUP BY Role
    `);
    
    console.log('   New role distribution:');
    for (const row of updatedUsers) {
      const isValid = NEW_ROLES.includes(row.role as NewRole);
      const status = isValid ? '✅' : '⚠️';
      console.log(`     ${status} ${row.role}: ${row.count} users`);
    }

    // Step 5: Update create-tables.sql comment (informational)
    console.log('\n📋 Step 5: Migration complete!');
    console.log('\n   Note: Update the Role column default in create-tables.sql if needed.');
    console.log('   Valid roles are now: owner, company_manager, store_manager, salesperson');

    console.log('\n✅ User roles migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateUserRoles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
