import { getConnection, closeConnection, sql } from '../src/lib/db';

async function createOnlineStoreTables() {
  console.log('🚀 Creating Online Store tables...\n');
  
  try {
    const pool = await getConnection();
    console.log('✅ Connected to SQL Server\n');

    // 1. Create OnlineStores table
    console.log('📋 Creating OnlineStores table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OnlineStores' AND xtype='U')
      CREATE TABLE OnlineStores (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        slug NVARCHAR(100) NOT NULL,
        custom_domain NVARCHAR(255),
        is_active BIT NOT NULL DEFAULT 1,
        
        -- Branding
        store_name NVARCHAR(255) NOT NULL,
        logo NVARCHAR(500),
        favicon NVARCHAR(500),
        description NVARCHAR(MAX),
        
        -- Theme
        theme_id NVARCHAR(50) NOT NULL DEFAULT 'default',
        primary_color NVARCHAR(20) DEFAULT '#3B82F6',
        secondary_color NVARCHAR(20) DEFAULT '#10B981',
        font_family NVARCHAR(100) DEFAULT 'Inter',
        
        -- Contact
        contact_email NVARCHAR(255) NOT NULL,
        contact_phone NVARCHAR(50),
        address NVARCHAR(500),
        
        -- Social
        facebook_url NVARCHAR(255),
        instagram_url NVARCHAR(255),
        
        -- Settings
        currency NVARCHAR(10) DEFAULT 'VND',
        timezone NVARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
        
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_OnlineStores_Stores FOREIGN KEY (store_id) REFERENCES Stores(id),
        CONSTRAINT UQ_OnlineStores_Slug UNIQUE (slug)
      )
    `);
    console.log('  ✅ OnlineStores table created');


    // 2. Create OnlineCategories table (before OnlineProducts due to FK)
    console.log('📋 Creating OnlineCategories table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OnlineCategories' AND xtype='U')
      CREATE TABLE OnlineCategories (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        online_store_id UNIQUEIDENTIFIER NOT NULL,
        name NVARCHAR(255) NOT NULL,
        slug NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        image NVARCHAR(500),
        parent_id UNIQUEIDENTIFIER,
        display_order INT DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1,
        
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_OnlineCategories_OnlineStores FOREIGN KEY (online_store_id) REFERENCES OnlineStores(id),
        CONSTRAINT FK_OnlineCategories_Parent FOREIGN KEY (parent_id) REFERENCES OnlineCategories(id),
        CONSTRAINT UQ_OnlineCategories_StoreSlug UNIQUE (online_store_id, slug)
      )
    `);
    console.log('  ✅ OnlineCategories table created');

    // Create index for OnlineCategories
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OnlineCategories_OnlineStoreId')
      CREATE INDEX IX_OnlineCategories_OnlineStoreId ON OnlineCategories(online_store_id)
    `);
    console.log('  ✅ OnlineCategories index created');

    // 3. Create OnlineProducts table
    console.log('📋 Creating OnlineProducts table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OnlineProducts' AND xtype='U')
      CREATE TABLE OnlineProducts (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        online_store_id UNIQUEIDENTIFIER NOT NULL,
        product_id UNIQUEIDENTIFIER NOT NULL,
        category_id UNIQUEIDENTIFIER,
        
        is_published BIT NOT NULL DEFAULT 0,
        online_price DECIMAL(18,2),
        online_description NVARCHAR(MAX),
        display_order INT DEFAULT 0,
        
        -- SEO
        seo_title NVARCHAR(255),
        seo_description NVARCHAR(500),
        seo_slug NVARCHAR(255) NOT NULL,
        
        -- Images (JSON array)
        images NVARCHAR(MAX),
        
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_OnlineProducts_OnlineStores FOREIGN KEY (online_store_id) REFERENCES OnlineStores(id),
        CONSTRAINT FK_OnlineProducts_Products FOREIGN KEY (product_id) REFERENCES Products(id),
        CONSTRAINT FK_OnlineProducts_Categories FOREIGN KEY (category_id) REFERENCES OnlineCategories(id),
        CONSTRAINT UQ_OnlineProducts_StoreSlug UNIQUE (online_store_id, seo_slug)
      )
    `);
    console.log('  ✅ OnlineProducts table created');

    // Create indexes for OnlineProducts
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OnlineProducts_OnlineStoreId')
      CREATE INDEX IX_OnlineProducts_OnlineStoreId ON OnlineProducts(online_store_id)
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OnlineProducts_ProductId')
      CREATE INDEX IX_OnlineProducts_ProductId ON OnlineProducts(product_id)
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OnlineProducts_Published')
      CREATE INDEX IX_OnlineProducts_Published ON OnlineProducts(online_store_id, is_published) WHERE is_published = 1
    `);
    console.log('  ✅ OnlineProducts indexes created');


    // 4. Create OnlineCustomers table (before ShoppingCarts due to FK)
    console.log('📋 Creating OnlineCustomers table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OnlineCustomers' AND xtype='U')
      CREATE TABLE OnlineCustomers (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        online_store_id UNIQUEIDENTIFIER NOT NULL,
        
        email NVARCHAR(255) NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        
        first_name NVARCHAR(100) NOT NULL,
        last_name NVARCHAR(100) NOT NULL,
        phone NVARCHAR(50),
        
        default_address_id UNIQUEIDENTIFIER,
        
        is_active BIT NOT NULL DEFAULT 1,
        is_verified BIT NOT NULL DEFAULT 0,
        
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        last_login_at DATETIME2,
        
        CONSTRAINT FK_OnlineCustomers_OnlineStores FOREIGN KEY (online_store_id) REFERENCES OnlineStores(id),
        CONSTRAINT UQ_OnlineCustomers_StoreEmail UNIQUE (online_store_id, email)
      )
    `);
    console.log('  ✅ OnlineCustomers table created');

    // 5. Create CustomerAddresses table
    console.log('📋 Creating CustomerAddresses table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CustomerAddresses' AND xtype='U')
      CREATE TABLE CustomerAddresses (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        customer_id UNIQUEIDENTIFIER NOT NULL,
        label NVARCHAR(50) NOT NULL,
        full_name NVARCHAR(255) NOT NULL,
        phone NVARCHAR(50) NOT NULL,
        province NVARCHAR(100) NOT NULL,
        district NVARCHAR(100) NOT NULL,
        ward NVARCHAR(100) NOT NULL,
        address_line NVARCHAR(500) NOT NULL,
        is_default BIT NOT NULL DEFAULT 0,
        
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_CustomerAddresses_OnlineCustomers FOREIGN KEY (customer_id) REFERENCES OnlineCustomers(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✅ CustomerAddresses table created');

    // Create index for CustomerAddresses
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CustomerAddresses_CustomerId')
      CREATE INDEX IX_CustomerAddresses_CustomerId ON CustomerAddresses(customer_id)
    `);
    console.log('  ✅ CustomerAddresses index created');


    // 6. Create ShoppingCarts table
    console.log('📋 Creating ShoppingCarts table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ShoppingCarts' AND xtype='U')
      CREATE TABLE ShoppingCarts (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        online_store_id UNIQUEIDENTIFIER NOT NULL,
        session_id NVARCHAR(255),
        customer_id UNIQUEIDENTIFIER,
        
        subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
        shipping_fee DECIMAL(18,2) NOT NULL DEFAULT 0,
        total DECIMAL(18,2) NOT NULL DEFAULT 0,
        
        coupon_code NVARCHAR(50),
        
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        expires_at DATETIME2 NOT NULL,
        
        CONSTRAINT FK_ShoppingCarts_OnlineStores FOREIGN KEY (online_store_id) REFERENCES OnlineStores(id),
        CONSTRAINT FK_ShoppingCarts_OnlineCustomers FOREIGN KEY (customer_id) REFERENCES OnlineCustomers(id)
      )
    `);
    console.log('  ✅ ShoppingCarts table created');

    // Create indexes for ShoppingCarts
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ShoppingCarts_SessionId')
      CREATE INDEX IX_ShoppingCarts_SessionId ON ShoppingCarts(session_id) WHERE session_id IS NOT NULL
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ShoppingCarts_CustomerId')
      CREATE INDEX IX_ShoppingCarts_CustomerId ON ShoppingCarts(customer_id) WHERE customer_id IS NOT NULL
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ShoppingCarts_ExpiresAt')
      CREATE INDEX IX_ShoppingCarts_ExpiresAt ON ShoppingCarts(expires_at)
    `);
    console.log('  ✅ ShoppingCarts indexes created');

    // 7. Create CartItems table
    console.log('📋 Creating CartItems table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CartItems' AND xtype='U')
      CREATE TABLE CartItems (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        cart_id UNIQUEIDENTIFIER NOT NULL,
        online_product_id UNIQUEIDENTIFIER NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(18,2) NOT NULL,
        total_price DECIMAL(18,2) NOT NULL,
        
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_CartItems_ShoppingCarts FOREIGN KEY (cart_id) REFERENCES ShoppingCarts(id) ON DELETE CASCADE,
        CONSTRAINT FK_CartItems_OnlineProducts FOREIGN KEY (online_product_id) REFERENCES OnlineProducts(id)
      )
    `);
    console.log('  ✅ CartItems table created');

    // Create index for CartItems
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CartItems_CartId')
      CREATE INDEX IX_CartItems_CartId ON CartItems(cart_id)
    `);
    console.log('  ✅ CartItems index created');


    // 8. Create OnlineOrders table
    console.log('📋 Creating OnlineOrders table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OnlineOrders' AND xtype='U')
      CREATE TABLE OnlineOrders (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        order_number NVARCHAR(50) NOT NULL,
        online_store_id UNIQUEIDENTIFIER NOT NULL,
        
        -- Customer info
        customer_id UNIQUEIDENTIFIER,
        customer_email NVARCHAR(255) NOT NULL,
        customer_name NVARCHAR(255) NOT NULL,
        customer_phone NVARCHAR(50) NOT NULL,
        
        -- Shipping
        shipping_address NVARCHAR(MAX) NOT NULL,
        shipping_method NVARCHAR(100),
        shipping_fee DECIMAL(18,2) NOT NULL DEFAULT 0,
        tracking_number NVARCHAR(100),
        carrier NVARCHAR(100),
        estimated_delivery DATETIME2,
        
        -- Order details
        subtotal DECIMAL(18,2) NOT NULL,
        discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
        total DECIMAL(18,2) NOT NULL,
        
        -- Status
        status NVARCHAR(20) NOT NULL DEFAULT 'pending',
        payment_status NVARCHAR(20) NOT NULL DEFAULT 'pending',
        payment_method NVARCHAR(20) NOT NULL,
        
        -- Notes
        customer_note NVARCHAR(MAX),
        internal_note NVARCHAR(MAX),
        
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        confirmed_at DATETIME2,
        shipped_at DATETIME2,
        delivered_at DATETIME2,
        cancelled_at DATETIME2,
        
        CONSTRAINT FK_OnlineOrders_OnlineStores FOREIGN KEY (online_store_id) REFERENCES OnlineStores(id),
        CONSTRAINT FK_OnlineOrders_OnlineCustomers FOREIGN KEY (customer_id) REFERENCES OnlineCustomers(id),
        CONSTRAINT UQ_OnlineOrders_OrderNumber UNIQUE (order_number)
      )
    `);
    console.log('  ✅ OnlineOrders table created');

    // Create indexes for OnlineOrders
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OnlineOrders_OnlineStoreId')
      CREATE INDEX IX_OnlineOrders_OnlineStoreId ON OnlineOrders(online_store_id)
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OnlineOrders_Status')
      CREATE INDEX IX_OnlineOrders_Status ON OnlineOrders(online_store_id, status)
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OnlineOrders_CreatedAt')
      CREATE INDEX IX_OnlineOrders_CreatedAt ON OnlineOrders(online_store_id, created_at DESC)
    `);
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OnlineOrders_CustomerId')
      CREATE INDEX IX_OnlineOrders_CustomerId ON OnlineOrders(customer_id) WHERE customer_id IS NOT NULL
    `);
    console.log('  ✅ OnlineOrders indexes created');

    // 9. Create OnlineOrderItems table
    console.log('📋 Creating OnlineOrderItems table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OnlineOrderItems' AND xtype='U')
      CREATE TABLE OnlineOrderItems (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        order_id UNIQUEIDENTIFIER NOT NULL,
        online_product_id UNIQUEIDENTIFIER NOT NULL,
        product_name NVARCHAR(255) NOT NULL,
        product_sku NVARCHAR(100),
        quantity INT NOT NULL,
        unit_price DECIMAL(18,2) NOT NULL,
        total_price DECIMAL(18,2) NOT NULL,
        
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_OnlineOrderItems_OnlineOrders FOREIGN KEY (order_id) REFERENCES OnlineOrders(id) ON DELETE CASCADE,
        CONSTRAINT FK_OnlineOrderItems_OnlineProducts FOREIGN KEY (online_product_id) REFERENCES OnlineProducts(id)
      )
    `);
    console.log('  ✅ OnlineOrderItems table created');

    // Create index for OnlineOrderItems
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OnlineOrderItems_OrderId')
      CREATE INDEX IX_OnlineOrderItems_OrderId ON OnlineOrderItems(order_id)
    `);
    console.log('  ✅ OnlineOrderItems index created');


    // 10. Create ShippingZones table
    console.log('📋 Creating ShippingZones table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ShippingZones' AND xtype='U')
      CREATE TABLE ShippingZones (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        online_store_id UNIQUEIDENTIFIER NOT NULL,
        name NVARCHAR(100) NOT NULL,
        provinces NVARCHAR(MAX) NOT NULL,
        
        flat_rate DECIMAL(18,2),
        free_shipping_threshold DECIMAL(18,2),
        
        is_active BIT NOT NULL DEFAULT 1,
        
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_ShippingZones_OnlineStores FOREIGN KEY (online_store_id) REFERENCES OnlineStores(id)
      )
    `);
    console.log('  ✅ ShippingZones table created');

    // Create index for ShippingZones
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ShippingZones_OnlineStoreId')
      CREATE INDEX IX_ShippingZones_OnlineStoreId ON ShippingZones(online_store_id)
    `);
    console.log('  ✅ ShippingZones index created');

    await closeConnection();
    console.log('\n✅ All Online Store tables created successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create tables:', error);
    await closeConnection();
    process.exit(1);
  }
}

createOnlineStoreTables();
