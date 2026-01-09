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

async function seedSalesData() {
  console.log('Tao du lieu ban hang mau...\n');

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
    const users = await pool.request().query(`SELECT TOP 1 id FROM Users`);
    const userId = users.recordset.length > 0 ? users.recordset[0].id : null;

    // Lay khach hang
    const customers = await pool.request()
      .input('storeId', sql.UniqueIdentifier, store.id)
      .query(`SELECT id, full_name FROM Customers WHERE store_id = @storeId`);

    // Lay san pham
    const products = await pool.request()
      .input('storeId', sql.UniqueIdentifier, store.id)
      .query(`SELECT id, name, price, cost_price, stock_quantity FROM Products WHERE store_id = @storeId AND status = 'active'`);

    if (products.recordset.length === 0) {
      console.log('Khong co san pham nao!');
      return;
    }

    console.log(`Tim thay ${products.recordset.length} san pham\n`);

    // Tao 5 don hang mau
    for (let i = 0; i < 5; i++) {
      const saleId = uuidv4();
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - Math.floor(Math.random() * 30));

      // Chon ngau nhien 1-3 san pham
      const numProducts = Math.floor(Math.random() * 3) + 1;
      const selectedProducts = [];
      const usedIndexes = new Set<number>();
      
      for (let j = 0; j < numProducts && j < products.recordset.length; j++) {
        let idx;
        do {
          idx = Math.floor(Math.random() * products.recordset.length);
        } while (usedIndexes.has(idx));
        usedIndexes.add(idx);
        
        const product = products.recordset[idx];
        const quantity = Math.floor(Math.random() * 3) + 1;
        selectedProducts.push({
          ...product,
          quantity,
          subtotal: product.price * quantity
        });
      }

      const totalAmount = selectedProducts.reduce((sum, p) => sum + p.subtotal, 0);
      const customerId = customers.recordset.length > 0 
        ? customers.recordset[Math.floor(Math.random() * customers.recordset.length)].id 
        : null;

      // Tao don hang
      await pool.request()
        .input('id', sql.UniqueIdentifier, saleId)
        .input('storeId', sql.UniqueIdentifier, store.id)
        .input('customerId', sql.UniqueIdentifier, customerId)
        .input('invoiceNumber', sql.NVarChar, `INV-${Date.now()}-${i}`)
        .input('totalAmount', sql.Decimal(18, 2), totalAmount)
        .input('finalAmount', sql.Decimal(18, 2), totalAmount)
        .input('customerPayment', sql.Decimal(18, 2), totalAmount)
        .input('transactionDate', sql.DateTime, saleDate)
        .query(`
          INSERT INTO Sales (
            id, store_id, customer_id, invoice_number,
            total_amount, final_amount, customer_payment, status,
            transaction_date, created_at, updated_at
          ) VALUES (
            @id, @storeId, @customerId, @invoiceNumber,
            @totalAmount, @finalAmount, @customerPayment, 'completed',
            @transactionDate, GETDATE(), GETDATE()
          )
        `);

      // Tao chi tiet don hang
      for (const product of selectedProducts) {
        await pool.request()
          .input('id', sql.UniqueIdentifier, uuidv4())
          .input('saleId', sql.UniqueIdentifier, saleId)
          .input('productId', sql.UniqueIdentifier, product.id)
          .input('quantity', sql.Decimal(18, 2), product.quantity)
          .input('price', sql.Decimal(18, 2), product.price)
          .query(`
            INSERT INTO SalesItems (
              id, sales_transaction_id, product_id, quantity, price, created_at
            ) VALUES (
              @id, @saleId, @productId, @quantity, @price, GETDATE()
            )
          `);
      }

      console.log(`[DON ${i + 1}] ${totalAmount.toLocaleString('vi-VN')} VND - ${selectedProducts.length} san pham`);
    }

    // Thong ke
    console.log('\nThong ke don hang:');
    const stats = await pool.request()
      .input('storeId', sql.UniqueIdentifier, store.id)
      .query(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(final_amount) as total_revenue,
          AVG(final_amount) as avg_order_value
        FROM Sales
        WHERE store_id = @storeId AND status = 'completed'
      `);
    
    console.table(stats.recordset);

    console.log('\nHoan tat tao 5 don hang mau!');
  } catch (error) {
    console.error('Loi:', error);
  } finally {
    await pool.close();
  }
}

seedSalesData();
