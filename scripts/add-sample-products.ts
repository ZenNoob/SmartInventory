import sql from 'mssql';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const config: sql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'Data_QuanLyBanHang_Online',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function addSampleProducts() {
  let pool: sql.ConnectionPool | null = null;
  
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected!\n');

    // Get store ID
    const storeResult = await pool.request().query(`SELECT TOP 1 id FROM Stores`);
    if (storeResult.recordset.length === 0) {
      console.log('No store found!');
      return;
    }
    const storeId = storeResult.recordset[0].id;
    console.log('Store ID:', storeId);

    // Get categories
    const categoriesResult = await pool.request()
      .input('storeId', sql.UniqueIdentifier, storeId)
      .query(`SELECT id, name FROM Categories WHERE store_id = @storeId`);
    
    const categories = categoriesResult.recordset;
    console.log('Categories:', categories.map(c => c.name));

    // Get or create categories if needed
    let giongLuaCategory = categories.find(c => c.name.toLowerCase().includes('giống lúa'));
    let cayTrongCategory = categories.find(c => c.name.toLowerCase().includes('cây trồng'));
    let phanBonCategory = categories.find(c => c.name.toLowerCase().includes('phân bón'));
    let thuocBVTVCategory = categories.find(c => c.name.toLowerCase().includes('thuốc'));

    // Create missing categories
    if (!giongLuaCategory) {
      const id = crypto.randomUUID();
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('storeId', sql.UniqueIdentifier, storeId)
        .input('name', sql.NVarChar, 'Giống lúa')
        .input('description', sql.NVarChar, 'Các loại giống lúa')
        .query(`INSERT INTO Categories (id, store_id, name, description, created_at, updated_at) 
                VALUES (@id, @storeId, @name, @description, GETDATE(), GETDATE())`);
      giongLuaCategory = { id, name: 'Giống lúa' };
      console.log('Created category: Giống lúa');
    }

    if (!phanBonCategory) {
      const id = crypto.randomUUID();
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('storeId', sql.UniqueIdentifier, storeId)
        .input('name', sql.NVarChar, 'Phân bón')
        .input('description', sql.NVarChar, 'Các loại phân bón')
        .query(`INSERT INTO Categories (id, store_id, name, description, created_at, updated_at) 
                VALUES (@id, @storeId, @name, @description, GETDATE(), GETDATE())`);
      phanBonCategory = { id, name: 'Phân bón' };
      console.log('Created category: Phân bón');
    }

    if (!thuocBVTVCategory) {
      const id = crypto.randomUUID();
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('storeId', sql.UniqueIdentifier, storeId)
        .input('name', sql.NVarChar, 'Thuốc BVTV')
        .input('description', sql.NVarChar, 'Thuốc bảo vệ thực vật')
        .query(`INSERT INTO Categories (id, store_id, name, description, created_at, updated_at) 
                VALUES (@id, @storeId, @name, @description, GETDATE(), GETDATE())`);
      thuocBVTVCategory = { id, name: 'Thuốc BVTV' };
      console.log('Created category: Thuốc BVTV');
    }

    // Get units
    const unitsResult = await pool.request()
      .input('storeId', sql.UniqueIdentifier, storeId)
      .query(`SELECT id, name FROM Units WHERE store_id = @storeId`);
    
    const units = unitsResult.recordset;
    console.log('Units:', units.map(u => u.name));

    let kgUnit = units.find(u => u.name.toLowerCase() === 'kg');
    let baoUnit = units.find(u => u.name.toLowerCase() === 'bao');
    let chaiUnit = units.find(u => u.name.toLowerCase() === 'chai');
    let goiUnit = units.find(u => u.name.toLowerCase() === 'gói');

    // Create missing units
    if (!kgUnit) {
      const id = crypto.randomUUID();
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('storeId', sql.UniqueIdentifier, storeId)
        .input('name', sql.NVarChar, 'Kg')
        .query(`INSERT INTO Units (id, store_id, name, created_at, updated_at) 
                VALUES (@id, @storeId, @name, GETDATE(), GETDATE())`);
      kgUnit = { id, name: 'Kg' };
      console.log('Created unit: Kg');
    }

    if (!chaiUnit) {
      const id = crypto.randomUUID();
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('storeId', sql.UniqueIdentifier, storeId)
        .input('name', sql.NVarChar, 'Chai')
        .query(`INSERT INTO Units (id, store_id, name, created_at, updated_at) 
                VALUES (@id, @storeId, @name, GETDATE(), GETDATE())`);
      chaiUnit = { id, name: 'Chai' };
      console.log('Created unit: Chai');
    }

    if (!goiUnit) {
      const id = crypto.randomUUID();
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('storeId', sql.UniqueIdentifier, storeId)
        .input('name', sql.NVarChar, 'Gói')
        .query(`INSERT INTO Units (id, store_id, name, created_at, updated_at) 
                VALUES (@id, @storeId, @name, GETDATE(), GETDATE())`);
      goiUnit = { id, name: 'Gói' };
      console.log('Created unit: Gói');
    }

    // Sample products to add
    const sampleProducts = [
      // Giống lúa
      { name: 'Giống lúa OM18', categoryId: giongLuaCategory?.id, unitId: kgUnit?.id, costPrice: 35000, sellingPrice: 42000, description: 'Giống lúa OM18 chất lượng cao, năng suất tốt' },
      { name: 'Giống lúa Đài Thơm 8', categoryId: giongLuaCategory?.id, unitId: kgUnit?.id, costPrice: 38000, sellingPrice: 45000, description: 'Giống lúa Đài Thơm 8, gạo thơm ngon' },
      { name: 'Giống lúa Jasmine 85', categoryId: giongLuaCategory?.id, unitId: kgUnit?.id, costPrice: 42000, sellingPrice: 50000, description: 'Giống lúa Jasmine 85, xuất khẩu' },
      { name: 'Giống lúa IR 50404', categoryId: giongLuaCategory?.id, unitId: kgUnit?.id, costPrice: 28000, sellingPrice: 35000, description: 'Giống lúa IR 50404, năng suất cao' },
      { name: 'Giống lúa Nàng Hoa 9', categoryId: giongLuaCategory?.id, unitId: kgUnit?.id, costPrice: 45000, sellingPrice: 55000, description: 'Giống lúa Nàng Hoa 9, gạo dẻo thơm' },
      
      // Phân bón
      { name: 'Phân NPK 16-16-8', categoryId: phanBonCategory?.id, unitId: baoUnit?.id || kgUnit?.id, costPrice: 450000, sellingPrice: 520000, description: 'Phân NPK 16-16-8, bao 50kg' },
      { name: 'Phân Urê Phú Mỹ', categoryId: phanBonCategory?.id, unitId: baoUnit?.id || kgUnit?.id, costPrice: 380000, sellingPrice: 450000, description: 'Phân Urê Phú Mỹ, bao 50kg' },
      { name: 'Phân DAP Đình Vũ', categoryId: phanBonCategory?.id, unitId: baoUnit?.id || kgUnit?.id, costPrice: 650000, sellingPrice: 750000, description: 'Phân DAP Đình Vũ, bao 50kg' },
      { name: 'Phân Kali đỏ', categoryId: phanBonCategory?.id, unitId: baoUnit?.id || kgUnit?.id, costPrice: 420000, sellingPrice: 500000, description: 'Phân Kali đỏ (KCl), bao 50kg' },
      { name: 'Phân hữu cơ vi sinh', categoryId: phanBonCategory?.id, unitId: baoUnit?.id || kgUnit?.id, costPrice: 180000, sellingPrice: 220000, description: 'Phân hữu cơ vi sinh, bao 25kg' },
      
      // Thuốc BVTV
      { name: 'Thuốc trừ sâu Regent 800WG', categoryId: thuocBVTVCategory?.id, unitId: goiUnit?.id, costPrice: 85000, sellingPrice: 100000, description: 'Thuốc trừ sâu Regent 800WG, gói 100g' },
      { name: 'Thuốc trừ bệnh Anvil 5SC', categoryId: thuocBVTVCategory?.id, unitId: chaiUnit?.id, costPrice: 120000, sellingPrice: 145000, description: 'Thuốc trừ bệnh Anvil 5SC, chai 250ml' },
      { name: 'Thuốc trừ cỏ Sofit 300EC', categoryId: thuocBVTVCategory?.id, unitId: chaiUnit?.id, costPrice: 95000, sellingPrice: 115000, description: 'Thuốc trừ cỏ Sofit 300EC, chai 500ml' },
      { name: 'Thuốc kích thích sinh trưởng GA3', categoryId: thuocBVTVCategory?.id, unitId: goiUnit?.id, costPrice: 45000, sellingPrice: 55000, description: 'Thuốc kích thích sinh trưởng GA3, gói 10g' },
      { name: 'Thuốc trừ rầy Chess 50WG', categoryId: thuocBVTVCategory?.id, unitId: goiUnit?.id, costPrice: 75000, sellingPrice: 90000, description: 'Thuốc trừ rầy Chess 50WG, gói 100g' },
    ];

    console.log('\nAdding sample products...');
    let addedCount = 0;

    for (const product of sampleProducts) {
      // Check if product already exists
      const existingResult = await pool.request()
        .input('storeId', sql.UniqueIdentifier, storeId)
        .input('name', sql.NVarChar, product.name)
        .query(`SELECT id FROM Products WHERE store_id = @storeId AND name = @name`);

      if (existingResult.recordset.length > 0) {
        console.log(`⏭️ Product "${product.name}" already exists`);
        continue;
      }

      const productId = crypto.randomUUID();
      const sku = `SP${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(-3).toUpperCase()}`;

      await pool.request()
        .input('id', sql.UniqueIdentifier, productId)
        .input('storeId', sql.UniqueIdentifier, storeId)
        .input('name', sql.NVarChar, product.name)
        .input('sku', sql.NVarChar, sku)
        .input('categoryId', sql.UniqueIdentifier, product.categoryId)
        .input('costPrice', sql.Decimal(18, 2), product.costPrice)
        .input('price', sql.Decimal(18, 2), product.sellingPrice)
        .input('description', sql.NVarChar, product.description)
        .input('status', sql.NVarChar, 'active')
        .input('stockQuantity', sql.Int, 100)
        .query(`
          INSERT INTO Products (id, store_id, name, sku, category_id, cost_price, price, description, status, stock_quantity, created_at, updated_at)
          VALUES (@id, @storeId, @name, @sku, @categoryId, @costPrice, @price, @description, @status, @stockQuantity, GETDATE(), GETDATE())
        `);

      console.log(`✅ Added: ${product.name}`);
      addedCount++;
    }

    console.log(`\n✅ Done! Added ${addedCount} new products.`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

addSampleProducts();
