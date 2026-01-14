-- =============================================
-- Migration Script: Inventory Transfer Tables
-- =============================================
-- This script creates tables for inventory transfer
-- between stores within the same tenant.
-- =============================================

-- =============================================
-- Table: PurchaseLots
-- Stores purchase lot information for FIFO tracking
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PurchaseLots' AND xtype='U')
CREATE TABLE PurchaseLots (
    Id NVARCHAR(36) PRIMARY KEY,
    ProductId NVARCHAR(36) NOT NULL,
    StoreId NVARCHAR(36) NOT NULL,
    ImportDate DATETIME NOT NULL,
    Quantity DECIMAL(18,4) NOT NULL,
    RemainingQuantity DECIMAL(18,4) NOT NULL,
    Cost DECIMAL(18,2) NOT NULL,
    UnitId NVARCHAR(36) NOT NULL,
    PurchaseOrderId NVARCHAR(36),
    SourceTransferId NVARCHAR(36),
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (ProductId) REFERENCES Products(Id),
    FOREIGN KEY (StoreId) REFERENCES Stores(Id),
    FOREIGN KEY (PurchaseOrderId) REFERENCES PurchaseOrders(Id),
    FOREIGN KEY (UnitId) REFERENCES Units(Id)
);

-- Add SourceTransferId column if PurchaseLots table already exists but column doesn't
IF EXISTS (SELECT * FROM sysobjects WHERE name='PurchaseLots' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseLots') AND name = 'SourceTransferId')
BEGIN
    ALTER TABLE PurchaseLots ADD SourceTransferId NVARCHAR(36);
END;

-- =============================================
-- Table: InventoryTransfers
-- Stores inventory transfer records between stores
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='InventoryTransfers' AND xtype='U')
CREATE TABLE InventoryTransfers (
    Id NVARCHAR(36) PRIMARY KEY,
    SourceStoreId NVARCHAR(36) NOT NULL,
    DestinationStoreId NVARCHAR(36) NOT NULL,
    TransferNumber NVARCHAR(50) NOT NULL,
    TransferDate DATETIME NOT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'completed',
    Notes NVARCHAR(MAX),
    CreatedBy NVARCHAR(36),
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (SourceStoreId) REFERENCES Stores(Id),
    FOREIGN KEY (DestinationStoreId) REFERENCES Stores(Id)
);

-- =============================================
-- Table: InventoryTransferItems
-- Stores individual items in an inventory transfer
-- =============================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='InventoryTransferItems' AND xtype='U')
CREATE TABLE InventoryTransferItems (
    Id NVARCHAR(36) PRIMARY KEY,
    TransferId NVARCHAR(36) NOT NULL,
    ProductId NVARCHAR(36) NOT NULL,
    Quantity DECIMAL(18,4) NOT NULL,
    Cost DECIMAL(18,2) NOT NULL,
    UnitId NVARCHAR(36) NOT NULL,
    SourceLotId NVARCHAR(36),
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (TransferId) REFERENCES InventoryTransfers(Id),
    FOREIGN KEY (ProductId) REFERENCES Products(Id),
    FOREIGN KEY (UnitId) REFERENCES Units(Id)
);

-- =============================================
-- Indexes for Performance
-- =============================================

-- Index for PurchaseLots lookup by product and store (for FIFO queries)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PurchaseLots_ProductId_StoreId')
CREATE INDEX IX_PurchaseLots_ProductId_StoreId ON PurchaseLots(ProductId, StoreId);

-- Index for PurchaseLots lookup by import date (for FIFO ordering)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PurchaseLots_ImportDate')
CREATE INDEX IX_PurchaseLots_ImportDate ON PurchaseLots(ImportDate);

-- Index for PurchaseLots lookup by purchase order
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PurchaseLots_PurchaseOrderId')
CREATE INDEX IX_PurchaseLots_PurchaseOrderId ON PurchaseLots(PurchaseOrderId);

-- Index for InventoryTransfers lookup by source store
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InventoryTransfers_SourceStoreId')
CREATE INDEX IX_InventoryTransfers_SourceStoreId ON InventoryTransfers(SourceStoreId);

-- Index for InventoryTransfers lookup by destination store
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InventoryTransfers_DestinationStoreId')
CREATE INDEX IX_InventoryTransfers_DestinationStoreId ON InventoryTransfers(DestinationStoreId);

-- Index for InventoryTransferItems lookup by transfer
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InventoryTransferItems_TransferId')
CREATE INDEX IX_InventoryTransferItems_TransferId ON InventoryTransferItems(TransferId);

-- Add foreign key for SourceTransferId in PurchaseLots (if not exists)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_PurchaseLots_InventoryTransfers')
   AND EXISTS (SELECT * FROM sysobjects WHERE name='InventoryTransfers' AND xtype='U')
   AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseLots') AND name = 'SourceTransferId')
BEGIN
    ALTER TABLE PurchaseLots 
    ADD CONSTRAINT FK_PurchaseLots_InventoryTransfers 
    FOREIGN KEY (SourceTransferId) REFERENCES InventoryTransfers(Id);
END;

PRINT 'Inventory Transfer tables created successfully!';
