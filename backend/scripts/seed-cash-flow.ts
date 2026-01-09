import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true }
};

// Du lieu mau cho phieu thu chi (type: 'thu' hoac 'chi')
const cashFlowData = [
  // Phieu chi
  { type: 'chi', amount: 500000, reason: 'Thanh toan tien dien thang 1', category: 'Tien ich' },
  { type: 'chi', amount: 1200000, reason: 'Mua vat tu van phong pham', category: 'Van phong pham' },
  { type: 'chi', amount: 800000, reason: 'Chi phi van chuyen hang hoa', category: 'Van chuyen' },
  // Phieu thu
  { type: 'thu', amount: 3500000, reason: 'Thu tien ban hang ngay 05/01', category: 'Doanh thu' },
  { type: 'thu', amount: 2000000, reason: 'Khach hang thanh toan cong no', category: 'Thu no' },
];

async function seedCashFlow() {
  console.log('Tao phieu thu chi mau...\n');

  const pool = await sql.connect(config);

  try {
    // Lay store dau tien
    const stores = await pool.request().query(`
      SELECT TOP 1 id, name FROM Stores WHERE status = 'active'
    `);

    if (stores.recordset.length === 0) {
      console.log('Khong tim thay cua hang nao!');
      return;
    }

    const store = stores.recordset[0];
    console.log(`Cua hang: ${store.name}\n`);

    // Lay user dau tien
    const users = await pool.request().query(`
      SELECT TOP 1 id FROM Users
    `);

    const userId = users.recordset.length > 0 ? users.recordset[0].id : null;

    // Tao 5 phieu thu chi
    for (const item of cashFlowData) {
      const id = uuidv4();
      const transactionDate = new Date();
      transactionDate.setDate(transactionDate.getDate() - Math.floor(Math.random() * 30));

      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('storeId', sql.UniqueIdentifier, store.id)
        .input('type', sql.NVarChar, item.type)
        .input('amount', sql.Decimal(18, 2), item.amount)
        .input('reason', sql.NVarChar, item.reason)
        .input('category', sql.NVarChar, item.category)
        .input('userId', sql.UniqueIdentifier, userId)
        .input('transactionDate', sql.DateTime, transactionDate)
        .query(`
          INSERT INTO CashTransactions (
            id, store_id, type, amount, reason, category, 
            created_by, transaction_date, created_at
          ) VALUES (
            @id, @storeId, @type, @amount, @reason, @category,
            @userId, @transactionDate, GETDATE()
          )
        `);

      const label = item.type === 'thu' ? '[THU]' : '[CHI]';
      console.log(`${label} ${item.amount.toLocaleString('vi-VN')} VND - ${item.reason}`);
    }

    // Thong ke
    console.log('\nThong ke:');
    const stats = await pool.request()
      .input('storeId', sql.UniqueIdentifier, store.id)
      .query(`
        SELECT 
          type,
          COUNT(*) as count,
          SUM(amount) as total
        FROM CashTransactions
        WHERE store_id = @storeId
        GROUP BY type
      `);
    
    console.table(stats.recordset);

    console.log('\nHoan tat tao 5 phieu thu chi!');
  } catch (error) {
    console.error('Loi:', error);
  } finally {
    await pool.close();
  }
}

seedCashFlow();
