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

// Dữ liệu khách hàng Pokemon
const customersData = [
  { name: 'Ash Ketchum', phone: '0901234567', email: 'ash@pokemon.com', address: 'Pallet Town' },
  { name: 'Misty Waterflower', phone: '0901234568', email: 'misty@pokemon.com', address: 'Cerulean City' },
  { name: 'Brock Harrison', phone: '0901234569', email: 'brock@pokemon.com', address: 'Pewter City' },
  { name: 'Gary Oak', phone: '0901234570', email: 'gary@pokemon.com', address: 'Pallet Town' },
  { name: 'Dawn Berlitz', phone: '0901234571', email: 'dawn@pokemon.com', address: 'Twinleaf Town' },
];

// Dữ liệu danh mục sản phẩm
const categoriesData = [
  { name: 'Pokemon Cards', description: 'The bai Pokemon' },
  { name: 'Pokemon Figures', description: 'Mo hinh Pokemon' },
  { name: 'Pokemon Plush', description: 'Thu bong Pokemon' },
  { name: 'Pokemon Accessories', description: 'Phu kien Pokemon' },
];

// Dữ liệu đơn vị
const unitsData = [
  { name: 'Cai', description: 'Don vi tinh cai' },
  { name: 'Bo', description: 'Don vi tinh bo' },
  { name: 'Hop', description: 'Don vi tinh hop' },
];

// Dữ liệu sản phẩm Pokemon
const productsData = [
  { name: 'Pikachu Card Rare', price: 150000, costPrice: 100000, stock: 50, category: 'Pokemon Cards' },
  { name: 'Charizard Card Ultra Rare', price: 500000, costPrice: 350000, stock: 20, category: 'Pokemon Cards' },
  { name: 'Mewtwo Card Legendary', price: 800000, costPrice: 600000, stock: 10, category: 'Pokemon Cards' },
  { name: 'Booster Pack Scarlet Violet', price: 120000, costPrice: 80000, stock: 100, category: 'Pokemon Cards' },
  { name: 'Pikachu Figure Nendoroid', price: 450000, costPrice: 300000, stock: 30, category: 'Pokemon Figures' },
  { name: 'Eevee Evolution Set', price: 1200000, costPrice: 900000, stock: 15, category: 'Pokemon Figures' },
  { name: 'Gengar Figure Premium', price: 650000, costPrice: 450000, stock: 25, category: 'Pokemon Figures' },
  { name: 'Pikachu Plush 30cm', price: 280000, costPrice: 180000, stock: 40, category: 'Pokemon Plush' },
  { name: 'Snorlax Giant Plush', price: 850000, costPrice: 600000, stock: 10, category: 'Pokemon Plush' },
  { name: 'Jigglypuff Plush', price: 220000, costPrice: 140000, stock: 35, category: 'Pokemon Plush' },
  { name: 'Pokeball Keychain', price: 50000, costPrice: 25000, stock: 100, category: 'Pokemon Accessories' },
  { name: 'Pokemon Trainer Cap', price: 180000, costPrice: 100000, stock: 50, category: 'Pokemon Accessories' },
  { name: 'Pokemon Card Sleeves 100pcs', price: 80000, costPrice: 45000, stock: 80, category: 'Pokemon Accessories' },
  { name: 'Pokemon Deck Box', price: 120000, costPrice: 70000, stock: 60, category: 'Pokemon Accessories' },
  { name: 'Lucario Card Holo', price: 250000, costPrice: 170000, stock: 30, category: 'Pokemon Cards' },
];

async function seedPokemonStore() {
  console.log('=== TAO DU LIEU MAU CHO STORE POKEMON ===\n');

  const pool = await sql.connect(config);

  try {
    // Tìm store pokemon
    const stores = await pool.request().query(`
      SELECT id, name FROM Stores WHERE LOWER(name) LIKE '%pokemon%' AND status = 'active'
    `);

    if (stores.recordset.length === 0) {
      console.log('Khong tim thay store Pokemon!');
      return;
    }

    const store = stores.recordset[0];
    console.log(`Store: ${store.name} (${store.id})\n`);

    // Lấy user đầu tiên
    const users = await pool.request().query(`SELECT TOP 1 id FROM Users`);
    const userId = users.recordset.length > 0 ? users.recordset[0].id : null;

    // === 1. TẠO DANH MỤC ===
    console.log('--- TAO DANH MUC ---');
    const categoryIds: Record<string, string> = {};
    
    for (const cat of categoriesData) {
      // Kiểm tra đã tồn tại chưa
      const existing = await pool.request()
        .input('storeId', sql.UniqueIdentifier, store.id)
        .input('name', sql.NVarChar, cat.name)
        .query(`SELECT id FROM Categories WHERE store_id = @storeId AND name = @name`);
      
      if (existing.recordset.length > 0) {
        categoryIds[cat.name] = existing.recordset[0].id;
        console.log(`[SKIP] Danh muc "${cat.name}" da ton tai`);
      } else {
        const id = uuidv4();
        await pool.request()
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

    // === 2. TẠO ĐƠN VỊ ===
    console.log('\n--- TAO DON VI ---');
    const unitIds: Record<string, string> = {};
    
    for (const unit of unitsData) {
      const existing = await pool.request()
        .input('storeId', sql.UniqueIdentifier, store.id)
        .input('name', sql.NVarChar, unit.name)
        .query(`SELECT id FROM Units WHERE store_id = @storeId AND name = @name`);
      
      if (existing.recordset.length > 0) {
        unitIds[unit.name] = existing.recordset[0].id;
        console.log(`[SKIP] Don vi "${unit.name}" da ton tai`);
      } else {
        const id = uuidv4();
        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('storeId', sql.UniqueIdentifier, store.id)
          .input('name', sql.NVarChar, unit.name)
          .input('description', sql.NVarChar, unit.description)
          .query(`
            INSERT INTO Units (id, store_id, name, description, created_at, updated_at)
            VALUES (@id, @storeId, @name, @description, GETDATE(), GETDATE())
          `);
        unitIds[unit.name] = id;
        console.log(`[OK] Tao don vi: ${unit.name}`);
      }
    }

    const defaultUnitId = unitIds['Cai'] || Object.values(unitIds)[0];

    // === 3. TẠO KHÁCH HÀNG ===
    console.log('\n--- TAO KHACH HANG ---');
    const customerIds: string[] = [];
    
    for (const cust of customersData) {
      const existing = await pool.request()
        .input('storeId', sql.UniqueIdentifier, store.id)
        .input('phone', sql.NVarChar, cust.phone)
        .query(`SELECT id FROM Customers WHERE store_id = @storeId AND phone = @phone`);
      
      if (existing.recordset.length > 0) {
        customerIds.push(existing.recordset[0].id);
        console.log(`[EXIST] Khach hang "${cust.name}" - ID: ${existing.recordset[0].id}`);
      } else {
        const id = uuidv4();
        await pool.request()
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

    // === 4. TẠO SẢN PHẨM ===
    console.log('\n--- TAO SAN PHAM ---');
    const productIds: string[] = [];
    const productPrices: Record<string, number> = {};
    
    for (const prod of productsData) {
      const existing = await pool.request()
        .input('storeId', sql.UniqueIdentifier, store.id)
        .input('name', sql.NVarChar, prod.name)
        .query(`SELECT id, price FROM Products WHERE store_id = @storeId AND name = @name`);
      
      if (existing.recordset.length > 0) {
        productIds.push(existing.recordset[0].id);
        productPrices[existing.recordset[0].id] = existing.recordset[0].price || prod.price;
        console.log(`[EXIST] San pham "${prod.name}" - ID: ${existing.recordset[0].id}`);
      } else {
        const id = uuidv4();
        const categoryId = categoryIds[prod.category];
        await pool.request()
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


    // === 5. TẠO ĐƠN HÀNG VÀ CÔNG NỢ ===
    console.log('\n--- TAO DON HANG ---');
    
    // Dữ liệu đơn hàng mẫu với số tiền thanh toán khác nhau để tạo công nợ
    const salesData = [
      { customerIndex: 0, productIndexes: [0, 4, 7], quantities: [3, 1, 2], paymentPercent: 0.5 }, // Ash - nợ 50%
      { customerIndex: 0, productIndexes: [1, 10], quantities: [2, 5], paymentPercent: 0.7 }, // Ash - nợ 30%
      { customerIndex: 1, productIndexes: [2, 5], quantities: [1, 1], paymentPercent: 0.6 }, // Misty - nợ 40%
      { customerIndex: 1, productIndexes: [8, 11], quantities: [1, 2], paymentPercent: 1 }, // Misty - trả đủ
      { customerIndex: 2, productIndexes: [3, 12, 13], quantities: [5, 2, 3], paymentPercent: 0.8 }, // Brock - nợ 20%
      { customerIndex: 2, productIndexes: [6, 9], quantities: [2, 3], paymentPercent: 0 }, // Brock - nợ 100%
      { customerIndex: 3, productIndexes: [1, 4, 14], quantities: [1, 2, 2], paymentPercent: 0.9 }, // Gary - nợ 10%
      { customerIndex: 3, productIndexes: [0, 3], quantities: [10, 8], paymentPercent: 1 }, // Gary - trả đủ
      { customerIndex: 4, productIndexes: [7, 8, 9], quantities: [2, 1, 2], paymentPercent: 0.4 }, // Dawn - nợ 60%
      { customerIndex: 4, productIndexes: [10, 11, 12], quantities: [3, 1, 2], paymentPercent: 1 }, // Dawn - trả đủ
    ];

    let totalSalesAmount = 0;
    let totalPayments = 0;

    for (let i = 0; i < salesData.length; i++) {
      const saleInfo = salesData[i];
      const saleId = uuidv4();
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - Math.floor(Math.random() * 60)); // Random trong 60 ngày

      const customerId = customerIds[saleInfo.customerIndex];
      
      // Tính tổng tiền đơn hàng
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

      // Tạo đơn hàng
      await pool.request()
        .input('id', sql.UniqueIdentifier, saleId)
        .input('storeId', sql.UniqueIdentifier, store.id)
        .input('customerId', sql.UniqueIdentifier, customerId)
        .input('invoiceNumber', sql.NVarChar, `PKM-${Date.now()}-${i}`)
        .input('totalAmount', sql.Decimal(18, 2), totalAmount)
        .input('finalAmount', sql.Decimal(18, 2), totalAmount)
        .input('customerPayment', sql.Decimal(18, 2), customerPayment)
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

      // Tạo chi tiết đơn hàng
      for (const item of items) {
        await pool.request()
          .input('id', sql.UniqueIdentifier, uuidv4())
          .input('saleId', sql.UniqueIdentifier, saleId)
          .input('productId', sql.UniqueIdentifier, item.productId)
          .input('quantity', sql.Decimal(18, 2), item.quantity)
          .input('price', sql.Decimal(18, 2), item.price)
          .query(`
            INSERT INTO SalesItems (
              id, sales_transaction_id, product_id, quantity, price, created_at
            ) VALUES (
              @id, @saleId, @productId, @quantity, @price, GETDATE()
            )
          `);
      }

      // Tạo payment record nếu có thanh toán
      if (customerPayment > 0) {
        await pool.request()
          .input('id', sql.UniqueIdentifier, uuidv4())
          .input('storeId', sql.UniqueIdentifier, store.id)
          .input('customerId', sql.UniqueIdentifier, customerId)
          .input('amount', sql.Decimal(18, 2), customerPayment)
          .input('paymentDate', sql.DateTime, saleDate)
          .input('notes', sql.NVarChar, `Thanh toan don hang PKM-${i}`)
          .query(`
            INSERT INTO Payments (id, store_id, customer_id, amount, payment_date, notes, created_at)
            VALUES (@id, @storeId, @customerId, @amount, @paymentDate, @notes, GETDATE())
          `);
      }

      const debt = totalAmount - customerPayment;
      const debtStatus = debt > 0 ? `NO ${debt.toLocaleString('vi-VN')} VND` : 'DA TRA DU';
      console.log(`[DON ${i + 1}] ${totalAmount.toLocaleString('vi-VN')} VND - Thanh toan: ${customerPayment.toLocaleString('vi-VN')} VND - ${debtStatus}`);
    }

    // === 6. THỐNG KÊ ===
    console.log('\n=== THONG KE ===');
    
    // Thống kê khách hàng
    const customerStats = await pool.request()
      .input('storeId', sql.UniqueIdentifier, store.id)
      .query(`
        SELECT 
          c.full_name as [Khach hang],
          ISNULL(SUM(s.final_amount), 0) as [Tong mua],
          ISNULL(SUM(p.amount), 0) as [Da tra],
          ISNULL(SUM(s.final_amount), 0) - ISNULL(SUM(p.amount), 0) as [Con no]
        FROM Customers c
        LEFT JOIN Sales s ON c.id = s.customer_id AND s.store_id = @storeId
        LEFT JOIN (
          SELECT customer_id, SUM(amount) as amount 
          FROM Payments 
          WHERE store_id = @storeId 
          GROUP BY customer_id
        ) p ON c.id = p.customer_id
        WHERE c.store_id = @storeId
        GROUP BY c.id, c.full_name
        ORDER BY [Tong mua] DESC
      `);
    
    console.log('\nKhach hang hang dau:');
    console.table(customerStats.recordset);

    // Thống kê sản phẩm bán chạy
    const productStats = await pool.request()
      .input('storeId', sql.UniqueIdentifier, store.id)
      .query(`
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

    // Tổng kết
    console.log('\n=== TONG KET ===');
    console.log(`Tong doanh thu: ${totalSalesAmount.toLocaleString('vi-VN')} VND`);
    console.log(`Tong da thu: ${totalPayments.toLocaleString('vi-VN')} VND`);
    console.log(`Tong cong no: ${(totalSalesAmount - totalPayments).toLocaleString('vi-VN')} VND`);
    console.log(`So don hang: ${salesData.length}`);
    console.log(`So khach hang: ${customerIds.length}`);
    console.log(`So san pham: ${productIds.length}`);

    console.log('\n=== HOAN TAT TAO DU LIEU CHO STORE POKEMON! ===');
  } catch (error) {
    console.error('Loi:', error);
  } finally {
    await pool.close();
  }
}

seedPokemonStore();
