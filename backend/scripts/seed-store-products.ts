import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

// Sản phẩm cho Driver Kamenrider - Thắt lưng Kamen Rider (ảnh từ wikimedia/public sources)
const kamenRiderProducts = [
  { name: 'DX Driver Revice', sku: 'KR-DRV001', price: 1500000, costPrice: 1200000, category: 'Driver', stock: 5, image: 'https://static.wikia.nocookie.net/kamenrider/images/8/8c/KRRe-Revicedriver.png' },
  { name: 'DX Desire Driver', sku: 'KR-DRV002', price: 1800000, costPrice: 1400000, category: 'Driver', stock: 3, image: 'https://static.wikia.nocookie.net/kamenrider/images/d/d5/KRGe-Desiredriver.png' },
  { name: 'DX Gotchard Driver', sku: 'KR-DRV003', price: 2000000, costPrice: 1600000, category: 'Driver', stock: 4, image: 'https://static.wikia.nocookie.net/kamenrider/images/5/5a/KRGo-Gotcharddriver.png' },
  { name: 'DX Zero One Driver', sku: 'KR-DRV004', price: 1600000, costPrice: 1300000, category: 'Driver', stock: 6, image: 'https://static.wikia.nocookie.net/kamenrider/images/0/0e/KR01-Zeroonedriver.png' },
  { name: 'DX Saber Driver', sku: 'KR-DRV005', price: 1700000, costPrice: 1350000, category: 'Driver', stock: 4, image: 'https://static.wikia.nocookie.net/kamenrider/images/a/a5/KRSa-Seikidriver.png' },
  { name: 'Vistamp Rex Genome', sku: 'KR-VS001', price: 350000, costPrice: 280000, category: 'Vistamp', stock: 10, image: 'https://static.wikia.nocookie.net/kamenrider/images/1/1e/KRRe-Rexvistamp.png' },
  { name: 'Vistamp Barid Rex', sku: 'KR-VS002', price: 400000, costPrice: 320000, category: 'Vistamp', stock: 8, image: 'https://static.wikia.nocookie.net/kamenrider/images/b/b5/KRRe-Baridrexvistamp.png' },
  { name: 'Vistamp Thunder Gale', sku: 'KR-VS003', price: 380000, costPrice: 300000, category: 'Vistamp', stock: 12, image: 'https://static.wikia.nocookie.net/kamenrider/images/t/t1/KRRe-Thundergalevistamp.png' },
  { name: 'Raise Buckle Boost', sku: 'KR-RB001', price: 450000, costPrice: 360000, category: 'Raise Buckle', stock: 7, image: 'https://static.wikia.nocookie.net/kamenrider/images/b/b0/KRGe-Boostraisebuckle.png' },
  { name: 'Raise Buckle Magnum', sku: 'KR-RB002', price: 480000, costPrice: 380000, category: 'Raise Buckle', stock: 5, image: 'https://static.wikia.nocookie.net/kamenrider/images/m/m1/KRGe-Magnumraisebuckle.png' },
  { name: 'Ride Chemy Card Hopper1', sku: 'KR-RC001', price: 200000, costPrice: 150000, category: 'Ride Chemy', stock: 15, image: 'https://static.wikia.nocookie.net/kamenrider/images/h/h1/KRGo-Hopper1card.png' },
  { name: 'Ride Chemy Card Steamliner', sku: 'KR-RC002', price: 220000, costPrice: 170000, category: 'Ride Chemy', stock: 12, image: 'https://static.wikia.nocookie.net/kamenrider/images/s/s1/KRGo-Steamlinercard.png' },
  { name: 'Progrise Key Rising Hopper', sku: 'KR-PK001', price: 300000, costPrice: 240000, category: 'Progrise Key', stock: 10, image: 'https://static.wikia.nocookie.net/kamenrider/images/r/r1/KR01-Risinghopperkey.png' },
  { name: 'Progrise Key Shining Hopper', sku: 'KR-PK002', price: 350000, costPrice: 280000, category: 'Progrise Key', stock: 8, image: 'https://static.wikia.nocookie.net/kamenrider/images/s/s2/KR01-Shininghopperkey.png' },
  { name: 'Wonder Ride Book Brave Dragon', sku: 'KR-WR001', price: 280000, costPrice: 220000, category: 'Wonder Ride Book', stock: 9, image: 'https://static.wikia.nocookie.net/kamenrider/images/b/b1/KRSa-Bravedragonbook.png' },
];

// Sản phẩm cho Pokemon - Thẻ Pokemon (ảnh từ official pokemon/public sources)
const pokemonProducts = [
  { name: 'Pikachu VMAX Rainbow', sku: 'PKM-001', price: 2500000, costPrice: 2000000, category: 'Pokemon VMAX', stock: 2, image: 'https://images.pokemontcg.io/swsh4/188_hires.png' },
  { name: 'Charizard VSTAR', sku: 'PKM-002', price: 1800000, costPrice: 1400000, category: 'Pokemon VSTAR', stock: 3, image: 'https://images.pokemontcg.io/swsh9/174_hires.png' },
  { name: 'Mewtwo V Full Art', sku: 'PKM-003', price: 800000, costPrice: 600000, category: 'Pokemon V', stock: 5, image: 'https://images.pokemontcg.io/swsh5/72_hires.png' },
  { name: 'Umbreon VMAX Alt Art', sku: 'PKM-004', price: 3500000, costPrice: 2800000, category: 'Pokemon VMAX', stock: 1, image: 'https://images.pokemontcg.io/swsh7/215_hires.png' },
  { name: 'Rayquaza VMAX', sku: 'PKM-005', price: 1200000, costPrice: 950000, category: 'Pokemon VMAX', stock: 4, image: 'https://images.pokemontcg.io/swsh7/218_hires.png' },
  { name: 'Gengar VMAX', sku: 'PKM-006', price: 900000, costPrice: 700000, category: 'Pokemon VMAX', stock: 6, image: 'https://images.pokemontcg.io/swsh8/271_hires.png' },
  { name: 'Mew VMAX', sku: 'PKM-007', price: 1500000, costPrice: 1200000, category: 'Pokemon VMAX', stock: 3, image: 'https://images.pokemontcg.io/swsh8/268_hires.png' },
  { name: 'Arceus VSTAR', sku: 'PKM-008', price: 600000, costPrice: 450000, category: 'Pokemon VSTAR', stock: 8, image: 'https://images.pokemontcg.io/swsh9/176_hires.png' },
  { name: 'Giratina VSTAR', sku: 'PKM-009', price: 700000, costPrice: 550000, category: 'Pokemon VSTAR', stock: 7, image: 'https://images.pokemontcg.io/swsh11/131_hires.png' },
  { name: 'Lugia VSTAR', sku: 'PKM-010', price: 850000, costPrice: 680000, category: 'Pokemon VSTAR', stock: 5, image: 'https://images.pokemontcg.io/swsh12pt5/202_hires.png' },
  { name: 'Booster Box Scarlet & Violet', sku: 'PKM-BB001', price: 1800000, costPrice: 1500000, category: 'Booster Box', stock: 10, image: 'https://images.pokemontcg.io/sv1/logo.png' },
  { name: 'Booster Box Obsidian Flames', sku: 'PKM-BB002', price: 1700000, costPrice: 1400000, category: 'Booster Box', stock: 8, image: 'https://images.pokemontcg.io/sv3/logo.png' },
  { name: 'Elite Trainer Box', sku: 'PKM-ETB001', price: 1200000, costPrice: 950000, category: 'Elite Trainer Box', stock: 6, image: 'https://images.pokemontcg.io/sv2/logo.png' },
  { name: 'Pikachu EX Box', sku: 'PKM-EX001', price: 450000, costPrice: 350000, category: 'Collection Box', stock: 12, image: 'https://images.pokemontcg.io/sv1/58_hires.png' },
  { name: 'Eevee Evolution Box', sku: 'PKM-EV001', price: 550000, costPrice: 420000, category: 'Collection Box', stock: 10, image: 'https://images.pokemontcg.io/swsh7/eevee_hires.png' },
];

// Sản phẩm cho Yugioh Store - Thẻ Yugioh (ảnh từ ygoprodeck API)
const yugiohProducts = [
  { name: 'Blue-Eyes White Dragon (LOB)', sku: 'YGO-001', price: 5000000, costPrice: 4000000, category: 'Ultra Rare', stock: 1, image: 'https://images.ygoprodeck.com/images/cards/89631139.jpg' },
  { name: 'Dark Magician (LOB)', sku: 'YGO-002', price: 3500000, costPrice: 2800000, category: 'Ultra Rare', stock: 2, image: 'https://images.ygoprodeck.com/images/cards/46986414.jpg' },
  { name: 'Exodia the Forbidden One', sku: 'YGO-003', price: 2000000, costPrice: 1600000, category: 'Ultra Rare', stock: 3, image: 'https://images.ygoprodeck.com/images/cards/33396948.jpg' },
  { name: 'Red-Eyes Black Dragon', sku: 'YGO-004', price: 1500000, costPrice: 1200000, category: 'Ultra Rare', stock: 4, image: 'https://images.ygoprodeck.com/images/cards/74677422.jpg' },
  { name: 'Ash Blossom & Joyous Spring', sku: 'YGO-005', price: 400000, costPrice: 300000, category: 'Secret Rare', stock: 10, image: 'https://images.ygoprodeck.com/images/cards/14558127.jpg' },
  { name: 'Nibiru the Primal Being', sku: 'YGO-006', price: 250000, costPrice: 180000, category: 'Secret Rare', stock: 15, image: 'https://images.ygoprodeck.com/images/cards/27204311.jpg' },
  { name: 'Accesscode Talker', sku: 'YGO-007', price: 350000, costPrice: 270000, category: 'Secret Rare', stock: 8, image: 'https://images.ygoprodeck.com/images/cards/86066372.jpg' },
  { name: 'Apollousa Bow of Goddess', sku: 'YGO-008', price: 300000, costPrice: 230000, category: 'Secret Rare', stock: 12, image: 'https://images.ygoprodeck.com/images/cards/4280258.jpg' },
  { name: 'Infinite Impermanence', sku: 'YGO-009', price: 200000, costPrice: 150000, category: 'Super Rare', stock: 20, image: 'https://images.ygoprodeck.com/images/cards/10045474.jpg' },
  { name: 'Called by the Grave', sku: 'YGO-010', price: 80000, costPrice: 50000, category: 'Common', stock: 50, image: 'https://images.ygoprodeck.com/images/cards/24224830.jpg' },
  { name: 'Booster Box Age of Overlord', sku: 'YGO-BB001', price: 1500000, costPrice: 1200000, category: 'Booster Box', stock: 8, image: 'https://images.ygoprodeck.com/images/cards/89631139.jpg' },
  { name: 'Booster Box Phantom Nightmare', sku: 'YGO-BB002', price: 1600000, costPrice: 1300000, category: 'Booster Box', stock: 6, image: 'https://images.ygoprodeck.com/images/cards/46986414.jpg' },
  { name: 'Structure Deck Cyberstorm', sku: 'YGO-SD001', price: 250000, costPrice: 180000, category: 'Structure Deck', stock: 15, image: 'https://images.ygoprodeck.com/images/cards/70095154.jpg' },
  { name: 'Starter Deck 2024', sku: 'YGO-ST001', price: 200000, costPrice: 150000, category: 'Starter Deck', stock: 20, image: 'https://images.ygoprodeck.com/images/cards/6007213.jpg' },
  { name: 'Duel Disk (Replica)', sku: 'YGO-ACC001', price: 800000, costPrice: 600000, category: 'Accessories', stock: 5, image: 'https://images.ygoprodeck.com/images/cards/89631139.jpg' },
];

async function seedStoreProducts() {
  console.log('🌱 Tạo sản phẩm theo từng cửa hàng...\n');

  const pool = await sql.connect(config);

  try {
    // Lấy danh sách cửa hàng
    const stores = await pool.request().query(`
      SELECT id, name, slug FROM Stores WHERE status = 'active'
    `);

    for (const store of stores.recordset) {
      console.log(`\n🏪 ${store.name}:`);

      // Xóa OnlineProducts trước (FK constraint)
      await pool.request()
        .input('storeId', sql.UniqueIdentifier, store.id)
        .query(`
          DELETE FROM OnlineProducts 
          WHERE product_id IN (SELECT id FROM Products WHERE store_id = @storeId)
        `);

      // Xóa sản phẩm cũ
      await pool.request()
        .input('storeId', sql.UniqueIdentifier, store.id)
        .query('DELETE FROM Products WHERE store_id = @storeId');
      
      // Xóa categories cũ
      await pool.request()
        .input('storeId', sql.UniqueIdentifier, store.id)
        .query('DELETE FROM Categories WHERE store_id = @storeId');
      
      console.log('   🗑️ Đã xóa dữ liệu cũ');

      // Chọn sản phẩm theo cửa hàng
      let products: typeof kamenRiderProducts;
      if (store.slug === 'kamenrider' || store.name.toLowerCase().includes('kamen')) {
        products = kamenRiderProducts;
      } else if (store.slug === 'pokemon' || store.name.toLowerCase().includes('pokemon')) {
        products = pokemonProducts;
      } else {
        products = yugiohProducts;
      }

      // Tạo categories
      const categories: Record<string, string> = {};
      const uniqueCategories = [...new Set(products.map((p) => p.category))];

      for (const catName of uniqueCategories) {
        const catId = uuidv4();
        await pool.request()
          .input('id', sql.UniqueIdentifier, catId)
          .input('storeId', sql.UniqueIdentifier, store.id)
          .input('name', sql.NVarChar, catName)
          .query(`
            INSERT INTO Categories (id, store_id, name, created_at, updated_at)
            VALUES (@id, @storeId, @name, GETDATE(), GETDATE())
          `);
        categories[catName] = catId;
      }
      console.log(`   ✅ Tạo ${uniqueCategories.length} categories`);

      // Tạo sản phẩm
      for (const product of products) {
        const productId = uuidv4();
        await pool.request()
          .input('id', sql.UniqueIdentifier, productId)
          .input('storeId', sql.UniqueIdentifier, store.id)
          .input('categoryId', sql.UniqueIdentifier, categories[product.category])
          .input('name', sql.NVarChar, product.name)
          .input('sku', sql.NVarChar, product.sku)
          .input('price', sql.Decimal(18, 2), product.price)
          .input('costPrice', sql.Decimal(18, 2), product.costPrice)
          .input('stock', sql.Int, product.stock)
          .input('images', sql.NVarChar, product.image)
          .query(`
            INSERT INTO Products (
              id, store_id, category_id, name, sku, 
              price, cost_price, stock_quantity, images, status,
              created_at, updated_at
            ) VALUES (
              @id, @storeId, @categoryId, @name, @sku,
              @price, @costPrice, @stock, @images, 'active',
              GETDATE(), GETDATE()
            )
          `);
      }
      console.log(`   ✅ Tạo ${products.length} sản phẩm`);
    }

    // Thống kê
    console.log('\n📊 Thống kê:');
    const stats = await pool.request().query(`
      SELECT s.name, COUNT(p.id) as products
      FROM Stores s
      LEFT JOIN Products p ON s.id = p.store_id
      WHERE s.status = 'active'
      GROUP BY s.id, s.name
    `);
    console.table(stats.recordset);

    console.log('\n🎉 Hoàn tất!');
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await pool.close();
  }
}

seedStoreProducts();
