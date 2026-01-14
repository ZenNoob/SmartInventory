/**
 * Inventory Transfer Migration Script
 * 
 * This script creates the tables needed for inventory transfer functionality:
 * - PurchaseLots: Stores purchase lot information for FIFO tracking
 * - InventoryTransfers: Stores inventory transfer records between stores
 * - InventoryTransferItems: Stores individual items in an inventory transfer
 * 
 * Usage: npm run migrate:inventory-transfer
 */

import sql from 'mssql';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Get database config
function getDbConfig(): sql.config {
  return {
    server: process.env.DB_SERVER || 'localhost',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '1433'),
    database: process.env.DB_NAME || 'SmartInventory',
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
  };
}

async function migrateInventoryTransfer(): Promise<void> {
  console.log('🚀 Starting Inventory Transfer migration...\n');
  console.log(`   Server: ${process.env.DB_SERVER || 'localhost'}`);
  console.log(`   Database: ${process.env.DB_NAME || 'SmartInventory'}\n`);
  
  let pool: sql.ConnectionPool | null = null;
  
  try {
    pool = await sql.connect(getDbConfig());
    console.log('✅ Connected to SQL Server\n');

    // Create PurchaseLots table if not exists
    console.log('📋 Creating PurchaseLots table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PurchaseLots' AND xtype='U')
      CREATE TABLE PurchaseLots (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        product_id UNIQUEIDENTIFIER NOT NULL,
        store_id UNIQUEIDENTIFIER NOT NULL,
        import_date DATETIME2 NOT NULL,
        quantity DECIMAL(18,4) NOT NULL,
        remaining_quantity DECIMAL(18,4) NOT NULL,
        cost DECIMAL(18,2) NOT NULL,
        unit_id UNIQUEIDENTIFIER NOT NULL,
        purchase_order_id UNIQUEIDENTIFIER,
        source_transfer_id UNIQUEIDENTIFIER,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (product_id) REFERENCES Products(id),
        FOREIGN KEY (store_id) REFERENCES Stores(id),
        FOREIGN KEY (purchase_order_id) REFERENCES PurchaseOrders(id),
        FOREIGN KEY (unit_id) REFERENCES Units(id)
      )
    `);
    console.log('  ✅ PurchaseLots table ready');

    // Add source_transfer_id column if table exists but column doesn't
    console.log('📋 Checking source_transfer_id column...');
    await pool.request().query(`
      IF EXISTS (SELECT * FROM sysobjects WHERE name='PurchaseLots' AND xtype='U')
         AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseLots') AND name = 'source_transfer_id')
      BEGIN
        ALTER TABLE PurchaseLots ADD source_transfer_id UNIQUEIDENTIFIER;
      END
    `);
    console.log('  ✅ source_transfer_id column ready');

    // Create InventoryTransfers table
    console.log('📋 Creating InventoryTransfers table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='InventoryTransfers' AND xtype='U')
      CREATE TABLE InventoryTransfers (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        source_store_id UNIQUEIDENTIFIER NOT NULL,
        destination_store_id UNIQUEIDENTIFIER NOT NULL,
        transfer_number NVARCHAR(50) NOT NULL,
        transfer_date DATETIME2 NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'completed',
        notes NVARCHAR(MAX),
        created_by UNIQUEIDENTIFIER,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (source_store_id) REFERENCES Stores(id),
        FOREIGN KEY (destination_store_id) REFERENCES Stores(id)
      )
    `);
    console.log('  ✅ InventoryTransfers table ready');

    // Create InventoryTransferItems table
    console.log('📋 Creating InventoryTransferItems table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='InventoryTransferItems' AND xtype='U')
      CREATE TABLE InventoryTransferItems (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        transfer_id UNIQUEIDENTIFIER NOT NULL,
        product_id UNIQUEIDENTIFIER NOT NULL,
        quantity DECIMAL(18,4) NOT NULL,
        cost DECIMAL(18,2) NOT NULL,
        unit_id UNIQUEIDENTIFIER NOT NULL,
        source_lot_id UNIQUEIDENTIFIER,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (transfer_id) REFERENCES InventoryTransfers(id),
        FOREIGN KEY (product_id) REFERENCES Products(id),
        FOREIGN KEY (unit_id) REFERENCES Units(id)
      )
    `);
    console.log('  ✅ InventoryTransferItems table ready');

    // Create indexes
    console.log('📋 Creating indexes...');
    
    const indexes = [
      { name: 'IX_PurchaseLots_ProductId_StoreId', table: 'PurchaseLots', columns: 'product_id, store_id' },
      { name: 'IX_PurchaseLots_ImportDate', table: 'PurchaseLots', columns: 'import_date' },
      { name: 'IX_PurchaseLots_PurchaseOrderId', table: 'PurchaseLots', columns: 'purchase_order_id' },
      { name: 'IX_InventoryTransfers_SourceStoreId', table: 'InventoryTransfers', columns: 'source_store_id' },
      { name: 'IX_InventoryTransfers_DestinationStoreId', table: 'InventoryTransfers', columns: 'destination_store_id' },
      { name: 'IX_InventoryTransferItems_TransferId', table: 'InventoryTransferItems', columns: 'transfer_id' },
    ];
    
    for (const index of indexes) {
      try {
        await pool.request().query(`
          IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = '${index.name}')
          CREATE INDEX ${index.name} ON ${index.table}(${index.columns})
        `);
      } catch (error) {
        console.log(`    ⚠️  Index ${index.name} may already exist`);
      }
    }
    console.log('  ✅ Indexes created');

    // Add foreign key for source_transfer_id
    console.log('📋 Adding foreign key constraint...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_PurchaseLots_InventoryTransfers')
         AND EXISTS (SELECT * FROM sysobjects WHERE name='InventoryTransfers' AND xtype='U')
         AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseLots') AND name = 'source_transfer_id')
      BEGIN
        ALTER TABLE PurchaseLots 
        ADD CONSTRAINT FK_PurchaseLots_InventoryTransfers 
        FOREIGN KEY (source_transfer_id) REFERENCES InventoryTransfers(id);
      END
    `);
    console.log('  ✅ Foreign key constraint ready');

    console.log('\n✅ Inventory Transfer migration completed!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Run the migration
migrateInventoryTransfer()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
