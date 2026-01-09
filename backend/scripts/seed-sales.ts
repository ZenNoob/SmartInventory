import 'dotenv/config';
import { query, queryOne } from '../src/db';

async function seedSales() {
  console.log('🌱 Bắt đầu tạo dữ liệu mẫu Sales...\n');

  try {
    // Lấy store_id
    const store = await queryOne<{ id: string; name: string }>(
      'SELECT TOP 1 id, name FROM Stores'
    );
    if (!store) {
      console.log('❌ Không tìm thấy Store nào!');
      process.exit(1);
    }
    console.log(`🏪 Store: ${store.name} (${store.id})`);

    // Lấy danh sách khách hàng (kiểm tra cột trước)
    let customers: { id: string; name: string }[] = [];
    try {
      const cols = await query<{ COLUMN_NAME: string }>(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Customers'`
      );
      console.log(`📋 Cột trong Customers: ${cols.map(c => c.COLUMN_NAME).join(', ')}`);
      
      customers = await query<{ id: string; name: string }>(
        'SELECT id, name FROM Customers WHERE store_id = @storeId',
        { storeId: store.id }
      );
    } catch (e) {
      console.log('⚠️ Không thể lấy khách hàng, sẽ dùng khách lẻ');
    }
    console.log(`👥 Tìm thấy ${customers.length} khách hàng`);

    // Lấy danh sách sản phẩm
    const products = await query<{ id: string; name: string; price: number }>(
      'SELECT id, name, price FROM Products WHERE store_id = @storeId',
      { storeId: store.id }
    );
    console.log(`📦 Tìm thấy ${products.length} sản phẩm`);

    if (products.length === 0) {
      console.log('❌ Không có sản phẩm nào để tạo đơn hàng!');
      process.exit(1);
    }

    // Tạo 20 đơn hàng mẫu trong 3 tháng gần đây
    const salesData = [];
    const now = new Date();
    
    for (let i = 0; i < 20; i++) {
      // Random ngày trong 90 ngày gần đây
      const daysAgo = Math.floor(Math.random() * 90);
      const saleDate = new Date(now);
      saleDate.setDate(saleDate.getDate() - daysAgo);

      // Random khách hàng (có thể null)
      const customer = customers.length > 0 && Math.random() > 0.3
        ? customers[Math.floor(Math.random() * customers.length)]
        : null;

      // Random 1-5 sản phẩm cho đơn hàng
      const numItems = Math.floor(Math.random() * 5) + 1;
      const selectedProducts = [];
      const usedIndexes = new Set<number>();
      
      for (let j = 0; j < numItems && j < products.length; j++) {
        let idx;
        do {
          idx = Math.floor(Math.random() * products.length);
        } while (usedIndexes.has(idx));
        usedIndexes.add(idx);
        
        const product = products[idx];
        const quantity = Math.floor(Math.random() * 5) + 1;
        selectedProducts.push({
          product,
          quantity,
          subtotal: product.price * quantity
        });
      }

      const totalAmount = selectedProducts.reduce((sum, p) => sum + p.subtotal, 0);
      const discount = Math.random() > 0.7 ? Math.floor(totalAmount * 0.1) : 0;
      const finalAmount = totalAmount - discount;

      salesData.push({
        date: saleDate,
        customerId: customer?.id || null,
        customerName: customer?.name || 'Khách lẻ',
        items: selectedProducts,
        totalAmount,
        discount,
        finalAmount
      });
    }

    // Sắp xếp theo ngày
    salesData.sort((a, b) => a.date.getTime() - b.date.getTime());

    console.log(`\n📝 Tạo ${salesData.length} đơn hàng mẫu...`);

    for (let i = 0; i < salesData.length; i++) {
      const sale = salesData[i];
      const invoiceNumber = `HD${String(i + 1).padStart(6, '0')}`;
      const saleId = crypto.randomUUID();

      // Insert Sale
      await query(
        `INSERT INTO Sales (
          id, store_id, invoice_number, customer_id, transaction_date,
          status, total_amount, vat_amount, final_amount, discount,
          points_used, points_discount, created_at, updated_at
        ) VALUES (
          @id, @storeId, @invoiceNumber, @customerId, @transactionDate,
          'printed', @totalAmount, 0, @finalAmount, @discount,
          0, 0, @transactionDate, @transactionDate
        )`,
        {
          id: saleId,
          storeId: store.id,
          invoiceNumber,
          customerId: sale.customerId,
          transactionDate: sale.date,
          totalAmount: sale.totalAmount,
          finalAmount: sale.finalAmount,
          discount: sale.discount
        }
      );

      // Insert SalesItems
      for (const item of sale.items) {
        await query(
          `INSERT INTO SalesItems (id, sales_transaction_id, product_id, quantity, price, created_at)
           VALUES (@id, @saleId, @productId, @quantity, @price, @createdAt)`,
          {
            id: crypto.randomUUID(),
            saleId,
            productId: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
            createdAt: sale.date
          }
        );
      }

      console.log(`   ✅ ${invoiceNumber}: ${sale.customerName} - ${sale.finalAmount.toLocaleString()}đ (${sale.date.toLocaleDateString('vi-VN')})`);
    }

    // Thống kê
    const stats = await queryOne<{ count: number; total: number }>(
      'SELECT COUNT(*) as count, SUM(final_amount) as total FROM Sales WHERE store_id = @storeId',
      { storeId: store.id }
    );

    console.log(`\n✅ Hoàn thành!`);
    console.log(`📊 Tổng: ${stats?.count} đơn hàng, doanh thu: ${stats?.total?.toLocaleString()}đ`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

seedSales();
