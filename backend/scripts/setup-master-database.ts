/**
 * Master Database Setup Script
 * 
 * This script creates the Master Database and its tables for the multi-tenant system.
 * It handles:
 * - Creating the Master Database (SmartInventory_Master)
 * - Creating Tenants and TenantUsers tables
 * - Creating indexes for performance
 * - Error handling and rollback support
 * 
 * Usage: npx ts-node scripts/setup-master-database.ts
 */

import sql from 'mssql';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Master database name
const MASTER_DB_NAME = process.env.MASTER_DB_NAME || 'SmartInventory_Master';

// Get base config (without database to connect to master)
function getBaseConfig(): sql.config {
  return {
    server: process.env.DB_SERVER || 'localhost',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
  };
}

// Get config for Master database
function getMasterDbConfig(): sql.config {
  return {
    ...getBaseConfig(),
    database: MASTER_DB_NAME,
  };
}

/**
 * Create the Master Database if it doesn't exist
 */
async function createMasterDatabase(): Promise<void> {
  console.log('📦 Creating Master Database...\n');
  
  const config = getBaseConfig();
  const pool = await sql.connect(config);
  
  try {
    // Check if database exists
    const result = await pool.request().query(`
      SELECT database_id FROM sys.databases WHERE name = '${MASTER_DB_NAME}'
    `);
    
    if (result.recordset.length === 0) {
      await pool.request().query(`CREATE DATABASE [${MASTER_DB_NAME}]`);
      console.log(`  ✅ Database '${MASTER_DB_NAME}' created`);
    } else {
      console.log(`  ℹ️  Database '${MASTER_DB_NAME}' already exists`);
    }
  } finally {
    await pool.close();
  }
}

/**
 * Create the Tenants table
 */
async function createTenantsTable(pool: sql.ConnectionPool): Promise<void> {
  console.log('  Creating Tenants table...');
  
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Tenants' AND xtype='U')
    CREATE TABLE Tenants (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      name NVARCHAR(255) NOT NULL,
      slug NVARCHAR(100) NOT NULL,
      email NVARCHAR(255) NOT NULL,
      phone NVARCHAR(20),
      status NVARCHAR(20) NOT NULL DEFAULT 'active',
      subscription_plan NVARCHAR(50) NOT NULL DEFAULT 'basic',
      database_name NVARCHAR(100) NOT NULL,
      database_server NVARCHAR(255) NOT NULL,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      
      CONSTRAINT UQ_Tenants_slug UNIQUE (slug),
      CONSTRAINT UQ_Tenants_email UNIQUE (email),
      CONSTRAINT UQ_Tenants_database_name UNIQUE (database_name)
    )
  `);
  
  console.log('    ✅ Tenants table created');
}

/**
 * Create the TenantUsers table
 */
async function createTenantUsersTable(pool: sql.ConnectionPool): Promise<void> {
  console.log('  Creating TenantUsers table...');
  
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TenantUsers' AND xtype='U')
    CREATE TABLE TenantUsers (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      tenant_id UNIQUEIDENTIFIER NOT NULL,
      email NVARCHAR(255) NOT NULL,
      password_hash NVARCHAR(255) NOT NULL,
      is_owner BIT NOT NULL DEFAULT 0,
      status NVARCHAR(20) NOT NULL DEFAULT 'active',
      failed_login_attempts INT NOT NULL DEFAULT 0,
      locked_until DATETIME2,
      last_login DATETIME2,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      
      CONSTRAINT FK_TenantUsers_Tenants FOREIGN KEY (tenant_id) 
        REFERENCES Tenants(id) ON DELETE CASCADE,
      CONSTRAINT UQ_TenantUsers_tenant_email UNIQUE (tenant_id, email)
    )
  `);
  
  console.log('    ✅ TenantUsers table created');
}

/**
 * Create indexes for performance
 */
async function createIndexes(pool: sql.ConnectionPool): Promise<void> {
  console.log('  Creating indexes...');
  
  const indexes = [
    { name: 'IX_Tenants_slug', table: 'Tenants', columns: 'slug' },
    { name: 'IX_Tenants_email', table: 'Tenants', columns: 'email' },
    { name: 'IX_Tenants_status', table: 'Tenants', columns: 'status' },
    { name: 'IX_TenantUsers_email', table: 'TenantUsers', columns: 'email' },
    { name: 'IX_TenantUsers_tenant_id', table: 'TenantUsers', columns: 'tenant_id' },
    { name: 'IX_TenantUsers_status', table: 'TenantUsers', columns: 'status' },
    { name: 'IX_TenantUsers_email_status', table: 'TenantUsers', columns: 'email, status' },
  ];
  
  for (const index of indexes) {
    try {
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = '${index.name}')
        CREATE INDEX ${index.name} ON ${index.table}(${index.columns})
      `);
    } catch (error) {
      // Index might already exist, continue
      console.log(`    ⚠️  Index ${index.name} may already exist`);
    }
  }
  
  console.log('    ✅ Indexes created');
}

/**
 * Rollback function to drop tables if setup fails
 */
async function rollback(pool: sql.ConnectionPool): Promise<void> {
  console.log('\n🔄 Rolling back changes...');
  
  const tables = ['TenantUsers', 'Tenants'];
  
  for (const table of tables) {
    try {
      await pool.request().query(`
        IF EXISTS (SELECT * FROM sysobjects WHERE name='${table}' AND xtype='U')
        DROP TABLE ${table}
      `);
      console.log(`  ✅ Dropped table ${table}`);
    } catch (error) {
      console.log(`  ⚠️  Could not drop table ${table}`);
    }
  }
}

/**
 * Main setup function
 */
async function setupMasterDatabase(): Promise<void> {
  console.log('🚀 Starting Master Database setup...\n');
  console.log(`   Server: ${process.env.DB_SERVER || 'localhost'}`);
  console.log(`   Database: ${MASTER_DB_NAME}\n`);
  
  let pool: sql.ConnectionPool | null = null;
  
  try {
    // Step 1: Create the database
    await createMasterDatabase();
    
    // Step 2: Connect to the Master database
    console.log('\n📋 Creating tables...\n');
    pool = await sql.connect(getMasterDbConfig());
    console.log(`  ✅ Connected to ${MASTER_DB_NAME}\n`);
    
    // Step 3: Create tables
    await createTenantsTable(pool);
    await createTenantUsersTable(pool);
    
    // Step 4: Create indexes
    console.log('\n📊 Creating indexes...\n');
    await createIndexes(pool);
    
    console.log('\n✅ Master Database setup completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Add MASTER_DB_NAME to your .env file');
    console.log('  2. Run the tenant migration to migrate existing data');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    
    // Attempt rollback
    if (pool) {
      await rollback(pool);
    }
    
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Run the setup
setupMasterDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
