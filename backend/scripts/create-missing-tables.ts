import 'dotenv/config';
import { query } from '../src/db';

async function createMissingTables() {
  console.log('🔧 Tạo các bảng còn thiếu...\n');

  try {
    // 1. Tạo bảng CashFlow (Thu chi)
    console.log('1️⃣ Tạo bảng CashFlow...');
    try {
      await query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CashFlow')
        CREATE TABLE CashFlow (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          store_id UNIQUEIDENTIFIER NOT NULL,
          type NVARCHAR(10) NOT NULL CHECK (type IN ('thu', 'chi')),
          category NVARCHAR(100) NOT NULL,
          amount DECIMAL(18, 2) NOT NULL,
          description NVARCHAR(500),
          reference_type NVARCHAR(50),
          reference_id UNIQUEIDENTIFIER,
          transaction_date DATETIME2 NOT NULL DEFAULT GETDATE(),
          created_by UNIQUEIDENTIFIER,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          FOREIGN KEY (store_id) REFERENCES Stores(id),
          FOREIGN KEY (created_by) REFERENCES Users(id)
        )
      `);
      console.log('   ✅ Đã tạo bảng CashFlow\n');
    } catch (e: unknown) {
      const error = e as Error;
      if (error.message?.includes('already exists')) {
        console.log('   ⏭️  Bảng CashFlow đã tồn tại\n');
      } else {
        console.log(`   ❌ Lỗi: ${error.message}\n`);
      }
    }

    // 2. Tạo bảng Inventory (Tồn kho)
    console.log('2️⃣ Tạo bảng Inventory...');
    try {
      await query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Inventory')
        CREATE TABLE Inventory (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          store_id UNIQUEIDENTIFIER NOT NULL,
          product_id UNIQUEIDENTIFIER NOT NULL,
          current_stock DECIMAL(18, 2) NOT NULL DEFAULT 0,
          average_cost DECIMAL(18, 2) NOT NULL DEFAULT 0,
          last_updated DATETIME2 NOT NULL DEFAULT GETDATE(),
          created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          FOREIGN KEY (store_id) REFERENCES Stores(id),
          FOREIGN KEY (product_id) REFERENCES Products(id),
          UNIQUE (store_id, product_id)
        )
      `);
      console.log('   ✅ Đã tạo bảng Inventory\n');
    } catch (e: unknown) {
      const error = e as Error;
      if (error.message?.includes('already exists')) {
        console.log('   ⏭️  Bảng Inventory đã tồn tại\n');
      } else {
        console.log(`   ❌ Lỗi: ${error.message}\n`);
      }
    }

    // 3. Tạo bảng Purchases (Nhập hàng)
    console.log('3️⃣ Tạo bảng Purchases...');
    try {
      await query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Purchases')
        CREATE TABLE Purchases (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          store_id UNIQUEIDENTIFIER NOT NULL,
          supplier_id UNIQUEIDENTIFIER,
          invoice_number NVARCHAR(50),
          purchase_date DATETIME2 NOT NULL DEFAULT GETDATE(),
          status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
          total_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
          paid_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
          remaining_debt DECIMAL(18, 2) NOT NULL DEFAULT 0,
          notes NVARCHAR(500),
          created_by UNIQUEIDENTIFIER,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          FOREIGN KEY (store_id) REFERENCES Stores(id),
          FOREIGN KEY (supplier_id) REFERENCES Suppliers(id),
          FOREIGN KEY (created_by) REFERENCES Users(id)
        )
      `);
      console.log('   ✅ Đã tạo bảng Purchases\n');
    } catch (e: unknown) {
      const error = e as Error;
      if (error.message?.includes('already exists')) {
        console.log('   ⏭️  Bảng Purchases đã tồn tại\n');
      } else {
        console.log(`   ❌ Lỗi: ${error.message}\n`);
      }
    }

    // 4. Tạo bảng PurchaseItems (Chi tiết nhập hàng)
    console.log('4️⃣ Tạo bảng PurchaseItems...');
    try {
      await query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseItems')
        CREATE TABLE PurchaseItems (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          purchase_id UNIQUEIDENTIFIER NOT NULL,
          product_id UNIQUEIDENTIFIER NOT NULL,
          quantity DECIMAL(18, 2) NOT NULL,
          unit_price DECIMAL(18, 2) NOT NULL,
          total_price DECIMAL(18, 2) NOT NULL,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          FOREIGN KEY (purchase_id) REFERENCES Purchases(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES Products(id)
        )
      `);
      console.log('   ✅ Đã tạo bảng PurchaseItems\n');
    } catch (e: unknown) {
      const error = e as Error;
      if (error.message?.includes('already exists')) {
        console.log('   ⏭️  Bảng PurchaseItems đã tồn tại\n');
      } else {
        console.log(`   ❌ Lỗi: ${error.message}\n`);
      }
    }

    // 5. Đồng bộ Inventory từ Products
    console.log('5️⃣ Đồng bộ Inventory từ Products...');
    try {
      await query(`
        INSERT INTO Inventory (id, store_id, product_id, current_stock, average_cost, last_updated, created_at, updated_at)
        SELECT 
          NEWID(),
          p.store_id,
          p.id,
          ISNULL(p.stock_quantity, 0),
          ISNULL(p.cost_price, 0),
          GETDATE(),
          GETDATE(),
          GETDATE()
        FROM Products p
        WHERE NOT EXISTS (
          SELECT 1 FROM Inventory i WHERE i.product_id = p.id AND i.store_id = p.store_id
        )
      `);
      console.log('   ✅ Đã đồng bộ Inventory\n');
    } catch (e: unknown) {
      const error = e as Error;
      console.log(`   ⚠️  Lỗi đồng bộ: ${error.message}\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Hoàn thành tạo các bảng!\n');

    // Kiểm tra lại
    console.log('📋 Kiểm tra lại các bảng:\n');
    const tables = ['CashFlow', 'Inventory', 'Purchases', 'PurchaseItems'];
    for (const table of tables) {
      const exists = await query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @table`,
        { table }
      );
      console.log(`   ${exists.length > 0 ? '✅' : '❌'} ${table}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

createMissingTables();
