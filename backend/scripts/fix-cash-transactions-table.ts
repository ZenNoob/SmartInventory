import 'dotenv/config';
import { query } from '../src/db';

async function fixCashTransactionsTable() {
  console.log('🔧 Kiểm tra và sửa bảng CashTransactions...\n');

  try {
    // Kiểm tra bảng CashTransactions có tồn tại không
    const cashTransactionsExists = await query(
      `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CashTransactions'`
    );

    const cashFlowExists = await query(
      `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CashFlow'`
    );

    console.log(`CashTransactions: ${cashTransactionsExists.length > 0 ? '✅ Có' : '❌ Không'}`);
    console.log(`CashFlow: ${cashFlowExists.length > 0 ? '✅ Có' : '❌ Không'}`);

    if (cashTransactionsExists.length === 0) {
      console.log('\n🔧 Tạo bảng CashTransactions...');
      
      await query(`
        CREATE TABLE CashTransactions (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          store_id UNIQUEIDENTIFIER NOT NULL,
          type NVARCHAR(10) NOT NULL CHECK (type IN ('thu', 'chi')),
          transaction_date DATETIME2 NOT NULL DEFAULT GETDATE(),
          amount DECIMAL(18, 2) NOT NULL,
          reason NVARCHAR(500) NOT NULL,
          category NVARCHAR(100),
          related_invoice_id UNIQUEIDENTIFIER,
          created_by UNIQUEIDENTIFIER,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          FOREIGN KEY (store_id) REFERENCES Stores(id),
          FOREIGN KEY (created_by) REFERENCES Users(id)
        )
      `);
      
      console.log('   ✅ Đã tạo bảng CashTransactions');
    }

    // Nếu có CashFlow, migrate dữ liệu sang CashTransactions
    if (cashFlowExists.length > 0 && cashTransactionsExists.length === 0) {
      console.log('\n🔄 Migrate dữ liệu từ CashFlow sang CashTransactions...');
      
      try {
        await query(`
          INSERT INTO CashTransactions (id, store_id, type, transaction_date, amount, reason, category, created_by, created_at)
          SELECT id, store_id, type, transaction_date, amount, description, category, created_by, created_at
          FROM CashFlow
        `);
        console.log('   ✅ Đã migrate dữ liệu');
      } catch (e) {
        console.log('   ⚠️  Không có dữ liệu để migrate hoặc lỗi:', e);
      }
    }

    console.log('\n✅ Hoàn thành!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

fixCashTransactionsTable();
