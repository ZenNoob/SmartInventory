import { query, queryOne, SqlValue } from '../db';
import { withTransaction, transactionQuery, transactionQueryOne, transactionInsert, transactionUpdate } from '../db/transaction';
import { sql } from '../db/connection';

export interface TransferItemInput {
  productId: string;
  quantity: number;
  unitId: string;
}

export interface InventoryTransferRequest {
  sourceStoreId: string;
  destinationStoreId: string;
  items: TransferItemInput[];
  notes?: string;
  createdBy?: string;
}

export interface TransferredItem {
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  unitId: string;
}

export interface InventoryTransferResult {
  success: boolean;
  transferId: string;
  transferNumber: string;
  message: string;
  transferredItems: TransferredItem[];
}

export interface InsufficientStockError {
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
}

interface PurchaseLotRecord {
  Id: string;
  ProductId: string;
  StoreId: string;
  ImportDate: Date;
  Quantity: number;
  RemainingQuantity: number;
  Cost: number;
  UnitId: string;
  PurchaseOrderId: string | null;
  SourceTransferId: string | null;
}

interface ProductRecord {
  id: string;
  name: string;
  store_id: string;
}

interface StoreRecord {
  Id: string;
  TenantId: string;
  name: string;
}


export class InventoryTransferService {
  /**
   * Generate a unique transfer number in format TF{YYYYMM}{sequence}
   */
  private async generateTransferNumber(transaction: sql.Transaction): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const datePrefix = `TF${year}${month}`;

    const result = await transactionQueryOne<{ TransferNumber: string }>(
      transaction,
      `SELECT TOP 1 TransferNumber 
       FROM InventoryTransfers 
       WHERE TransferNumber LIKE @prefix + '%' 
       ORDER BY TransferNumber DESC`,
      { prefix: datePrefix }
    );

    let nextSequence = 1;
    if (result) {
      const lastSequence = parseInt(result.TransferNumber.substring(datePrefix.length), 10);
      if (!isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }

    return `${datePrefix}${nextSequence.toString().padStart(4, '0')}`;
  }

  /**
   * Validate that both stores belong to the same tenant
   */
  async validateStoresSameTenant(sourceStoreId: string, destinationStoreId: string): Promise<{ valid: boolean; error?: string }> {
    const sourceStore = await queryOne<StoreRecord>(
      'SELECT Id, TenantId, name FROM Stores WHERE Id = @storeId',
      { storeId: sourceStoreId }
    );

    if (!sourceStore) {
      return { valid: false, error: 'Source store not found' };
    }

    const destStore = await queryOne<StoreRecord>(
      'SELECT Id, TenantId, name FROM Stores WHERE Id = @storeId',
      { storeId: destinationStoreId }
    );

    if (!destStore) {
      return { valid: false, error: 'Destination store not found' };
    }

    if (sourceStore.TenantId !== destStore.TenantId) {
      return { valid: false, error: 'Stores do not belong to the same tenant' };
    }

    if (sourceStoreId === destinationStoreId) {
      return { valid: false, error: 'Source and destination stores cannot be the same' };
    }

    return { valid: true };
  }

  /**
   * Check available stock for all items using FIFO method
   */
  async checkAvailableStock(
    sourceStoreId: string,
    items: TransferItemInput[]
  ): Promise<{ sufficient: boolean; errors: InsufficientStockError[] }> {
    const errors: InsufficientStockError[] = [];

    for (const item of items) {
      const stockResult = await queryOne<{ TotalRemaining: number }>(
        `SELECT COALESCE(SUM(RemainingQuantity), 0) as TotalRemaining
         FROM PurchaseLots
         WHERE ProductId = @productId AND StoreId = @storeId AND RemainingQuantity > 0`,
        { productId: item.productId, storeId: sourceStoreId }
      );

      const availableQuantity = stockResult?.TotalRemaining ?? 0;

      if (availableQuantity < item.quantity) {
        const product = await queryOne<ProductRecord>(
          'SELECT id, name FROM Products WHERE id = @productId',
          { productId: item.productId }
        );

        errors.push({
          productId: item.productId,
          productName: product?.name || 'Unknown Product',
          requestedQuantity: item.quantity,
          availableQuantity,
        });
      }
    }

    return {
      sufficient: errors.length === 0,
      errors,
    };
  }

  /**
   * Transfer inventory between stores using FIFO method
   */
  async transferInventory(request: InventoryTransferRequest): Promise<InventoryTransferResult> {
    // Validate stores belong to same tenant
    const validation = await this.validateStoresSameTenant(
      request.sourceStoreId,
      request.destinationStoreId
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check available stock
    const stockCheck = await this.checkAvailableStock(request.sourceStoreId, request.items);
    if (!stockCheck.sufficient) {
      const errorMessages = stockCheck.errors.map(
        e => `${e.productName}: requested ${e.requestedQuantity}, available ${e.availableQuantity}`
      );
      throw new InsufficientStockException(
        `Insufficient stock for transfer: ${errorMessages.join('; ')}`,
        stockCheck.errors
      );
    }

    return withTransaction(async (transaction) => {
      const transferId = crypto.randomUUID();
      const transferNumber = await this.generateTransferNumber(transaction);
      const now = new Date();
      const transferredItems: TransferredItem[] = [];

      // Create the transfer record
      await transactionInsert(transaction, 'InventoryTransfers', {
        Id: transferId,
        SourceStoreId: request.sourceStoreId,
        DestinationStoreId: request.destinationStoreId,
        TransferNumber: transferNumber,
        TransferDate: now,
        Status: 'completed',
        Notes: request.notes || null,
        CreatedBy: request.createdBy || null,
        CreatedAt: now,
      });

      // Process each item using FIFO
      for (const item of request.items) {
        const result = await this.processItemTransfer(
          transaction,
          transferId,
          request.sourceStoreId,
          request.destinationStoreId,
          item,
          now
        );
        transferredItems.push(result);
      }

      return {
        success: true,
        transferId,
        transferNumber,
        message: `Successfully transferred ${transferredItems.length} item(s)`,
        transferredItems,
      };
    });
  }

  /**
   * Process a single item transfer using FIFO deduction
   */
  private async processItemTransfer(
    transaction: sql.Transaction,
    transferId: string,
    sourceStoreId: string,
    destinationStoreId: string,
    item: TransferItemInput,
    transferDate: Date
  ): Promise<TransferredItem> {
    // Get product info
    const product = await transactionQueryOne<ProductRecord>(
      transaction,
      'SELECT id, name FROM Products WHERE id = @productId',
      { productId: item.productId }
    );

    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    // Get source lots ordered by import date (FIFO)
    const sourceLots = await transactionQuery<PurchaseLotRecord>(
      transaction,
      `SELECT * FROM PurchaseLots 
       WHERE ProductId = @productId AND StoreId = @storeId AND RemainingQuantity > 0
       ORDER BY ImportDate ASC`,
      { productId: item.productId, storeId: sourceStoreId }
    );

    let remainingToTransfer = item.quantity;
    let totalCost = 0;
    let totalQuantity = 0;

    // Deduct from source lots using FIFO
    for (const lot of sourceLots) {
      if (remainingToTransfer <= 0) break;

      const deductQuantity = Math.min(lot.RemainingQuantity, remainingToTransfer);
      const newRemainingQuantity = lot.RemainingQuantity - deductQuantity;

      // Update source lot
      await transactionQuery(
        transaction,
        `UPDATE PurchaseLots SET RemainingQuantity = @newRemaining WHERE Id = @lotId`,
        { newRemaining: newRemainingQuantity, lotId: lot.Id }
      );

      // Create transfer item record
      const transferItemId = crypto.randomUUID();
      await transactionInsert(transaction, 'InventoryTransferItems', {
        Id: transferItemId,
        TransferId: transferId,
        ProductId: item.productId,
        Quantity: deductQuantity,
        Cost: lot.Cost,
        UnitId: item.unitId,
        SourceLotId: lot.Id,
        CreatedAt: transferDate,
      });

      // Create new lot at destination store
      const newLotId = crypto.randomUUID();
      await transactionInsert(transaction, 'PurchaseLots', {
        Id: newLotId,
        ProductId: item.productId,
        StoreId: destinationStoreId,
        ImportDate: transferDate,
        Quantity: deductQuantity,
        RemainingQuantity: deductQuantity,
        Cost: lot.Cost,
        UnitId: item.unitId,
        PurchaseOrderId: null,
        SourceTransferId: transferId,
        CreatedAt: transferDate,
      });

      totalCost += lot.Cost * deductQuantity;
      totalQuantity += deductQuantity;
      remainingToTransfer -= deductQuantity;
    }

    // Calculate weighted average cost
    const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    return {
      productId: item.productId,
      productName: product.name,
      quantity: totalQuantity,
      cost: averageCost,
      unitId: item.unitId,
    };
  }
}

/**
 * Custom exception for insufficient stock errors
 */
export class InsufficientStockException extends Error {
  public readonly errors: InsufficientStockError[];

  constructor(message: string, errors: InsufficientStockError[]) {
    super(message);
    this.name = 'InsufficientStockException';
    this.errors = errors;
  }
}

export const inventoryTransferService = new InventoryTransferService();
