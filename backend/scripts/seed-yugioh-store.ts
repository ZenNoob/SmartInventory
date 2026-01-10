import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true },
};

// Dữ liệu khách hàng Yugioh
const customersData = [
  { name: 'Yugi Muto', phone: '0911234567', email: 'yugi@yugioh.com', address: 'Domino City' },
  { name: 'Seto Kaiba', phone: '0911234568', email: 'kaiba@kaibacorp.com', address: 'Kaiba Corp Tower' },
  { name: 'Joey Wheeler', phone: '0911234569', email: 'joey@yugioh.com', address: 'Domino City' },
  { name: 'Mai Valentine', phone: '0911234570', email: 'mai@yugioh.com', address: 'Domino City' },
  { name: 'Maximillion Pegasus', phone: '0911234571', email: 'pegasus@industrialillusions.com', address: 'Duelist Kingdom' },
];

// Dữ liệu danh mục sản phẩm
const categoriesData = [
  { name: 'Ultra Rare Cards', description: 'The bai Ultra Rare' },
  { name: 'Secret Rare Cards', description: 'The bai Secret Rare' },
  { name: 'Booster Box', description: 'Hop booster' },
  { name: 'Structure Deck', description: 'Bo bai Structure' },
  { name: 'Accessories', description: 'Phu kien Yugioh' },
];

// Dữ liệu sản phẩm Yugioh
const productsData = [
  { name: 'Blue-Eyes White Dragon LOB', price: 5000000, costPrice: 4000000, stock: 3, category: 'Ultra Rare Cards' },
  { name: 'Dark Magician LOB', price: 3500000, costPrice: 2800000, stock: 5, category: 'Ultra Rare Cards' },
  { name: 'Exodia the Forbidden One', price: 2000000, costPrice: 1600000, stock: 4, category: 'Ultra Rare Cards' },
  { name: 'Red-Eyes Black Dragon', price: 1500000, costPrice: 1200000, stock: 8, category: 'Ultra Rare Cards' },
  { name: 'Blue-Eyes Ultimate Dragon', price: 2500000, costPrice: 2000000, stock: 3, category: 'Ultra Rare Cards' },
  { name: 'Ash Blossom & Joyous Spring', price: 400000, costPrice: 300000, stock: 20, category: 'Secret Rare Cards' },
  { name: 'Nibiru the Primal Being', price: 250000, costPrice: 180000, stock: 25, category: 'Secret Rare Cards' },
  { name: 'Accesscode Talker', price: 350000, costPrice: 270000, stock: 15, category: 'Secret Rare Cards' },
  { name: 'Apollousa Bow of Goddess', price: 300000, costPrice: 230000, stock: 18, category: 'Secret Rare Cards' },
  { name: 'Infinite Impermanence', price: 200000, costPrice: 150000, stock: 30, category: 'Secret Rare Cards' },
  { name: 'Booster Box Age of Overlord', price: 1500000, costPrice: 1200000, stock: 10, category: 'Booster Box' },
  { name: 'Booster Box Phantom Nightmare', price: 1600000, costPrice: 1300000, stock: 8, category: 'Booster Box' },
  { name: 'Structure Deck Cyberstorm', price: 250000, costPrice: 180000, stock: 20, category: 'Structure Deck' },
  { name: 'Structure Deck Fire Kings', price: 280000, costPrice: 200000, stock: 15, category: 'Structure Deck' },
  { name: 'Duel Disk Replica', price: 800000, costPrice: 600000, stock: 5, category: 'Accessories' },
  { name: 'Card Sleeves 100pcs', price: 80000, costPrice: 50000, stock: 50, category: 'Accessories' },
  { name: 'Deck Box Premium', price: 150000, costPrice: 100000, stock: 30, category: 'Accessories' },
];

async function seedYugiohStore() {
  console.log('=== TAO DU LIEU MAU CHO STORE YUGIOH ===\n');

  const pool = await sql.connect(config);

  try {
    // Tìm store yugioh
    const stores = await pool.request().query(`
      SELECT id, name FROM Stores WHERE LOWER(name) LIKE '%yugioh%' AND status = 'active'
    `);

    if (stores.recordset.length === 0) {
      console.log('Khong tim thay store Yugioh!');
      return;
    }

    const store = stores.recordset[0];
    console.log(`Store: ${store.name} (${store.id})\n`);

    // === 1. TẠO DANH MỤC ===
    console.log('--- TAO DANH MUC ---');
    const categoryIds: Record<string, string> = {};

    for (const cat of categoriesData) {
      const existing = await pool
        .request()
        .input('storeId', sql.UniqueIdentifier, store.id)
        .input('name', sql.NVarChar, cat.name)
        .query(`SELECT id FROM Categories WHERE store_id = @storeId AND name = @name`);

      if (existing.recordset.length > 0) {
        categoryIds[cat.name] = existing.recordset[0].id;
        console.log(`[EXIST] Danh muc "${cat.name}"`);
      } else {
        const id = uuidv4();
        await pool
          .request()
          .input('id', sql.UniqueIdentifier, id)
          .input('storeId', sql.UniqueIdentifier, store.id)
          .input('name', sql.NVarChar, cat.name)
          .input('description', sql.NVarChar, cat.description)
          .query(`
            INSERT INTO Categories (id, store_id, name, description, created_at, updated_at)
            VALUES (@id, @storeId, @name, @description, GETDATE(), GETDATE())
          `);
        categoryIds[cat.name] = id;
        console.log(`[OK] Tao danh muc: ${cat.name}`);
      }
    }

    // === 2. TẠO KHÁCH HÀNG ===
    console.log('\n--- TAO KHACH HANG ---');
    const customerIds: string[] = [];

    for (const cust of customersData) {
      const existing = await pool
        .request()
        .input('storeId', sql.UniqueIdentifier, store.id)
        .input('phone', sql.NVarChar, cust.phone)
        .query(`SELECT id FROM Customers WHERE store_id = @storeId AND phone = @phone`);

      if (existing.recordset.length > 0) {
        customerIds.push(existing.recordset[0].id);
        console.log(`[EXIST] Khach hang "${cust.name}"`);
      } else {
        const id = uuidv4();
        await pool
          .request()
          .input('id', sql.UniqueIdentifier, id)
          .input('storeId', sql.UniqueIdentifier, store.id)
          .input('name', sql.NVarChar, cust.name)
          .input('phone', sql.NVarChar, cust.phone)
          .input('email', sql.NVarChar, cust.email)
          .input('address', sql.NVarChar, cust.address)
          .query(`
            INSERT INTO Customers (id, store_id, full_name, phone, email, address, created_at, updated_at)
            VALUES (@id, @storeId, @name, @phone, @email, @address, GETDATE(), GETDATE())
          `);
        customerIds.push(id);
        console.log(`[OK] Tao khach hang: ${cust.name}`);
      }
    }

    // === 3. TẠO SẢN PHẨM ===
    console.log('\n--- TAO SAN PHAM ---');
    const productIds: string[] = [];
    const productPrices: Record<string, number> = {};

    for (const prod of productsData) {
      const existing = await pool
        .request()
        .input('storeId', sql.UniqueIdentifier, store.id)
        .input('name', sql.NVarChar, prod.name)
        .query(`SELECT id, price FROM Products WHERE store_id = @storeId AND name = @name`);

      if (existing.recordset.length > 0) {
        productIds.push(existing.recordset[0].id);
        productPrices[existing.recordset[0].id] = existing.recordset[0].price || prod.price;
        console.log(`[EXIST] San pham "${prod.name}"`);
      } else {
        const id = uuidv4();
        const categoryId = categoryIds[prod.category];
        await pool
          .request()
          .input('id', sql.UniqueIdentifier, id)
          .input('storeId', sql.UniqueIdentifier, store.id)
          .input('categoryId', sql.UniqueIdentifier, categoryId)
          .input('name', sql.NVarChar, prod.name)
          .input('price', sql.Decimal(18, 2), prod.price)
          .input('costPrice', sql.Decimal(18, 2), prod.costPrice)
          .input('stock', sql.Int, prod.stock)
          .query(`
            INSERT INTO Products (id, store_id, category_id, name, price, cost_price, stock_quantity, status, created_at, updated_at)
            VALUES (@id, @storeId, @categoryId, @name, @price, @costPrice, @stock, 'active', GETDATE(), GETDATE())
          `);
        productIds.push(id);
        productPrices[id] = prod.price;
        console.log(`[OK] Tao san pham: ${prod.name} - ${prod.price.toLocaleString('vi-VN')} VND`);
      }
    }

    // === 4. TẠO ĐƠN HÀNG VÀ CÔNG NỢ ===
    console.log('\n--- TAO DON HANG ---');

    const salesData = [
      { customerIndex: 0, productIndexes: [0, 1], quantities: [1, 1], paymentPercent: 0.6 }, // Yugi - nợ 40%
      { customerIndex: 0, productIndexes: [5, 6, 9], quantities: [3, 2, 4], paymentPercent: 0.8 }, // Yugi
      { customerIndex: 1, productIndexes: [0, 4], quantities: [2, 1], paymentPercent: 0.5 }, // Kaiba - nợ 50%
      { customerIndex: 1, productIndexes: [10, 11], quantities: [3, 2], paymentPercent: 1 }, // Kaiba - trả đủ
      { customerIndex: 2, productIndexes: [3, 7, 8], quantities: [2, 1, 2], paymentPercent: 0.7 }, // Joey
      { customerIndex: 2, productIndexes: [12, 13, 15], quantities: [2, 2, 3], paymentPercent: 0 }, // Joey - nợ 100%
      { customerIndex: 3, productIndexes: [2, 5], quantities: [1, 5], paymentPercent: 0.9 }, // Mai
      { customerIndex: 3, productIndexes: [14, 16], quantities: [1, 2], paymentPercent: 1 }, // Mai - trả đủ
      { customerIndex: 4, productIndexes: [0, 1, 2], quantities: [1, 1, 2], paymentPercent: 0.4 }, // Pegasus - nợ 60%
      { customerIndex: 4, productIndexes: [10, 11, 12], quantities: [5, 3, 4], paymentPercent: 0.75 }, // Pegasus
    ];

    let totalSalesAmount = 0;
    let totalPayments = 0;

    for (let i = 0; i < salesData.length; i++) {
      const saleInfo = salesData[i];
      const saleId = uuidv4();
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - Math.floor(Math.random() * 60));

      const customerId = customerIds[saleInfo.customerIndex];

      let totalAmount = 0;
      const items: { productId: string; quantity: number; price: number }[] = [];

      for (let j = 0; j < saleInfo.productIndexes.length; j++) {
        const productId = productIds[saleInfo.productIndexes[j]];
        const quantity = saleInfo.quantities[j];
        const price = productPrices[productId];
        totalAmount += price * quantity;
        items.push({ productId, quantity, price });
      }

      const customerPayment = Math.round(totalAmount * saleInfo.paymentPercent);
      totalSalesAmount += totalAmount;
      totalPayments += customerPayment;

      await pool
        .request()
        .input('id', sql.UniqueIdentifier, saleId)
        .input('storeId', sql.UniqueIdentifier, store.id)
        .input('customerId', sql.UniqueIdentifier, customerId)
        .input('invoiceNumber', sql.NVarChar, `YGO-${Date.now()}-${i}`)
        .input('totalAmount', sql.Decimal(18, 2), totalAmount)
        .input('finalAmount', sql.Decimal(18, 2), totalAmount)
        .input('customerPayment', sql.Decimal(18, 2), customerPayment)
        .input('transactionDate', sql.DateTime, saleDate)
        .query(`
          INSERT INTO Sales (id, store_id, customer_id, invoice_number, total_amount, final_amount, customer_payment, status, transaction_date, created_at, updated_at)
          VALUES (@id, @storeId, @customerId, @invoiceNumber, @totalAmount, @finalAmount, @customerPayment, 'completed', @transactionDate, GETDATE(), GETDATE())
        `);

      for (const item of items) {
        await pool
          .request()
          .input('id', sql.UniqueIdentifier, uuidv4())
          .input('saleId', sql.UniqueIdentifier, saleId)
          .input('productId', sql.UniqueIdentifier, item.productId)
          .input('quantity', sql.Decimal(18, 2), item.quantity)
          .input('price', sql.Decimal(18, 2), item.price)
          .query(`
            INSERT INTO SalesItems (id, sales_transaction_id, product_id, quantity, price, created_at)
            VALUES (@id, @saleId, @productId, @quantity, @price, GETDATE())
          `);
      }

      if (customerPayment > 0) {
        await pool
          .request()
          .input('id', sql.UniqueIdentifier, uuidv4())
          .input('storeId', sql.UniqueIdentifier, store.id)
          .input('customerId', sql.UniqueIdentifier, customerId)
          .input('amount', sql.Decimal(18, 2), customerPayment)
          .input('paymentDate', sql.DateTime, saleDate)
          .input('notes', sql.NVarChar, `Thanh toan don hang YGO-${i}`)
          .query(`
            INSERT INTO Payments (id, store_id, customer_id, amount, payment_date, notes, created_at)
            VALUES (@id, @storeId, @customerId, @amount, @paymentDate, @notes, GETDATE())
          `);
      }

      const debt = totalAmount - customerPayment;
      const debtStatus = debt > 0 ? `NO ${debt.toLocaleString('vi-VN')} VND` : 'DA TRA DU';
      console.log(`[DON ${i + 1}] ${totalAmount.toLocaleString('vi-VN')} VND - Thanh toan: ${customerPayment.toLocaleString('vi-VN')} VND - ${debtStatus}`);
    }

    // === 5. THỐNG KÊ ===
    console.log('\n=== THONG KE ===');

    const customerStats = await pool.request().input('storeId', sql.UniqueIdentifier, store.id).query(`
        SELECT 
          c.full_name as [Khach hang],
          ISNULL(SUM(s.final_amount), 0) as [Tong mua],
          ISNULL((SELECT SUM(amount) FROM Payments WHERE customer_id = c.id AND store_id = @storeId), 0) as [Da tra],
          ISNULL(SUM(s.final_amount), 0) - ISNULL((SELECT SUM(amount) FROM Payments WHERE customer_id = c.id AND store_id = @storeId), 0) as [Con no]
        FROM Customers c
        LEFT JOIN Sales s ON c.id = s.customer_id AND s.store_id = @storeId
        WHERE c.store_id = @storeId
        GROUP BY c.id, c.full_name
        ORDER BY [Tong mua] DESC
      `);

    console.log('\nKhach hang hang dau:');
    console.table(customerStats.recordset);

    const productStats = await pool.request().input('storeId', sql.UniqueIdentifier, store.id).query(`
        SELECT TOP 5
          p.name as [San pham],
          SUM(si.quantity) as [So luong ban],
          SUM(si.quantity * si.price) as [Doanh thu]
        FROM SalesItems si
        JOIN Products p ON si.product_id = p.id
        JOIN Sales s ON si.sales_transaction_id = s.id
        WHERE s.store_id = @storeId
        GROUP BY p.id, p.name
        ORDER BY [Doanh thu] DESC
      `);

    console.log('\nSan pham ban chay:');
    console.table(productStats.recordset);

    console.log('\n=== TONG KET ===');
    console.log(`Tong doanh thu: ${totalSalesAmount.toLocaleString('vi-VN')} VND`);
    console.log(`Tong da thu: ${totalPayments.toLocaleString('vi-VN')} VND`);
    console.log(`Tong cong no: ${(totalSalesAmount - totalPayments).toLocaleString('vi-VN')} VND`);
    console.log(`So don hang: ${salesData.length}`);
    console.log(`So khach hang: ${customerIds.length}`);
    console.log(`So san pham: ${productIds.length}`);

    console.log('\n=== HOAN TAT TAO DU LIEU CHO STORE YUGIOH! ===');
  } catch (error) {
    console.error('Loi:', error);
  } finally {
    await pool.close();
  }
}

seedYugiohStore();
