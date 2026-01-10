/**
 * Migration Script: Create Permissions table for Multi-tenant RBAC
 * 
 * This script creates the Permissions table to support:
 * - Custom permissions per user per module
 * - Store-specific permissions (NULL store_id = all stores)
 * - Override default role permissions
 * 
 * Usage: npx tsx scripts/create-permissions-table.ts
 */

import 'dotenv/config';
import { query, queryOne } from '../src/db';

async function checkTableExists(tableName: string): Promise<boolean> {
  const result = await queryOne<{ count: number }>(`
    SELECT COUNT(*) as count 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME = @tableName
  `, { tableName });
  return (result?.count ?? 0) > 0;
}

async function createPermissionsTable(): Promise<void> {
  console.log('🚀 Creating Permissions table for Multi-tenant RBAC...\n');

  try {
    // Step 1: Check if Permissions table exists
    console.log('📋 Step 1: Checking if Permissions table exists...');
    const tableExists = await checkTableExists('Permissions');
    
    if (tableExists) {
      console.log('   ℹ️  Permissions table already exists');
      
      // Verify schema
      const columns = await query<{ COLUMN_NAME: string }>(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Permissions'
      `);
      console.log('   Current columns:', columns.map(c => c.COLUMN_NAME).join(', '));
    } else {
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
    }

    // Step 2: Create indexes
    console.log('\n📋 Step 2: Creating indexes...');
    
    const indexes = [
      { name: 'IX_Permissions_UserId', columns: 'UserId' },
      { name: 'IX_Permissions_StoreId', columns: 'StoreId' },
      { name: 'IX_Permissions_Module', columns: 'Module' },
      { name: 'IX_Permissions_User_Store', columns: 'UserId, StoreId' },
    ];
    
    for (const index of indexes) {
      try {
        const indexExists = await queryOne<{ count: number }>(`
          SELECT COUNT(*) as count FROM sys.indexes WHERE name = @name
        `, { name: index.name });
        
        if ((indexExists?.count ?? 0) === 0) {
          await query(`
            CREATE INDEX ${index.name} ON Permissions(${index.columns})
          `);
          console.log(`   ✅ Created index ${index.name}`);
        } else {
          console.log(`   ℹ️  Index ${index.name} already exists`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not create index ${index.name}`);
      }
    }

    // Step 3: Verify final schema
    console.log('\n📋 Step 3: Verifying final schema...');
    const columns = await query<{ 
      COLUMN_NAME: string; 
      DATA_TYPE: string; 
      IS_NULLABLE: string;
      CHARACTER_MAXIMUM_LENGTH: number | null;
    }>(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Permissions' 
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('   Permissions table schema:');
    for (const col of columns) {
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      console.log(`     - ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} (${col.IS_NULLABLE === 'YES' ? 'nullable' : 'required'})`);
    }

    console.log('\n✅ Permissions table setup completed successfully!\n');
    console.log('Table structure:');
    console.log('  - Id: Primary key (UUID)');
    console.log('  - UserId: Foreign key to Users table');
    console.log('  - Module: Module name (e.g., "products", "sales")');
    console.log('  - Actions: JSON array of permissions (e.g., ["view", "add", "edit"])');
    console.log('  - StoreId: Foreign key to Stores (NULL = applies to all stores)');
    console.log('  - CreatedAt/UpdatedAt: Timestamps');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    throw error;
  }
}

// Run setup
createPermissionsTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
