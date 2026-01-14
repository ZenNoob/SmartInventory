import { BaseRepository, PaginationOptions, PaginatedResult } from './base-repository';
import { query, queryOne, SqlValue, QueryParams } from '../db';
import { withTransaction, transactionQuery, transactionQueryOne, transactionInsert } from '../db/transaction';

export interface InventoryTransfer {
  id: string;
  sourceStoreId: string;
  destinationStoreId: string;
  transferNumber: string;
  transferDate: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface InventoryTransferItem {
  id: string;
  transferId: string;
  productId: string;
  quantity: number;
  cost: number;
  unitId: string;
  sourceLotId?: string;
  createdAt: string;
}

export interface InventoryTransferWithDetails extends InventoryTransfer {
  items: InventoryTransferItemWithProduct[];
  sourceStoreName?: string;
  destinationStoreName?: string;
}

export interface InventoryTransferItemWithProduct extends InventoryTransferItem {
  productName?: string;
  unitName?: string;
}

export interface CreateInventoryTransferInput {
  sourceStoreId: string;
  destinationStoreId: string;
  transferDate: string;
  notes?: string;
  createdBy?: string;
  items: CreateInventoryTransferItemInput[];
}

export interface CreateInventoryTransferItemInput {
  productId: string;
  quantity: number;
  cost: number;
  unitId: string;
  sourceLotId?: string;
}

interface InventoryTransferRecord {
  Id: string;
  SourceStoreId: string;
  DestinationStoreId: string;
  TransferNumber: string;
  TransferDate: Date;
  Status: string;
  Notes: string | null;
  CreatedBy: string | null;
  CreatedAt: Date;
  [key: string]: SqlValue;
}

interface InventoryTransferItemRecord {
  Id: string;
  TransferId: string;
  ProductId: string;
  Quantity: number;
  Cost: number;
  UnitId: string;
  SourceLotId: string | null;
  CreatedAt: Date;
  [key: string]: SqlValue;
}


export class InventoryTransferRepository {
  private tableName = 'InventoryTransfers';

  private mapToEntity(record: InventoryTransferRecord): InventoryTransfer {
    return {
      id: record.Id,
      sourceStoreId: record.SourceStoreId,
      destinationStoreId: record.DestinationStoreId,
      transferNumber: record.TransferNumber,
      transferDate: record.TransferDate instanceof Date 
        ? record.TransferDate.toISOString() 
        : String(record.TransferDate),
      status: record.Status as 'pending' | 'completed' | 'cancelled',
      notes: record.Notes || undefined,
      createdBy: record.CreatedBy || undefined,
      createdAt: record.CreatedAt instanceof Date 
        ? record.CreatedAt.toISOString() 
        : String(record.CreatedAt),
    };
  }

  private mapItemToEntity(record: InventoryTransferItemRecord): InventoryTransferItem {
    return {
      id: record.Id,
      transferId: record.TransferId,
      productId: record.ProductId,
      quantity: record.Quantity,
      cost: record.Cost,
      unitId: record.UnitId,
      sourceLotId: record.SourceLotId || undefined,
      createdAt: record.CreatedAt instanceof Date 
        ? record.CreatedAt.toISOString() 
        : String(record.CreatedAt),
    };
  }

  async generateTransferNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const datePrefix = `TF${year}${month}`;
    
    const queryString = `
      SELECT TOP 1 TransferNumber 
      FROM InventoryTransfers 
      WHERE TransferNumber LIKE @prefix + '%' 
      ORDER BY TransferNumber DESC
    `;
    
    const result = await queryOne<{ TransferNumber: string }>(queryString, { prefix: datePrefix });
    
    let nextSequence = 1;
    if (result) {
      const lastSequence = parseInt(result.TransferNumber.substring(datePrefix.length), 10);
      if (!isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }
    
    return `${datePrefix}${nextSequence.toString().padStart(4, '0')}`;
  }

  async create(input: CreateInventoryTransferInput): Promise<InventoryTransferWithDetails> {
    return withTransaction(async (transaction) => {
      const transferNumber = await this.generateTransferNumber();
      const transferId = crypto.randomUUID();
      const now = new Date();

      const insertQuery = `
        INSERT INTO InventoryTransfers (Id, SourceStoreId, DestinationStoreId, TransferNumber, TransferDate, Status, Notes, CreatedBy, CreatedAt)
        OUTPUT INSERTED.*
        VALUES (@id, @sourceStoreId, @destinationStoreId, @transferNumber, @transferDate, @status, @notes, @createdBy, @createdAt)
      `;

      const transferResult = await transactionQueryOne<InventoryTransferRecord>(
        transaction,
        insertQuery,
        {
          id: transferId,
          sourceStoreId: input.sourceStoreId,
          destinationStoreId: input.destinationStoreId,
          transferNumber,
          transferDate: new Date(input.transferDate),
          status: 'completed',
          notes: input.notes || null,
          createdBy: input.createdBy || null,
          createdAt: now,
        }
      );

      if (!transferResult) {
        throw new Error('Failed to create inventory transfer');
      }

      const items: InventoryTransferItemWithProduct[] = [];

      for (const item of input.items) {
        const itemId = crypto.randomUUID();
        
        const itemInsertQuery = `
          INSERT INTO InventoryTransferItems (Id, TransferId, ProductId, Quantity, Cost, UnitId, SourceLotId, CreatedAt)
          OUTPUT INSERTED.*
          VALUES (@id, @transferId, @productId, @quantity, @cost, @unitId, @sourceLotId, @createdAt)
        `;

        const itemResult = await transactionQueryOne<InventoryTransferItemRecord>(
          transaction,
          itemInsertQuery,
          {
            id: itemId,
            transferId,
            productId: item.productId,
            quantity: item.quantity,
            cost: item.cost,
            unitId: item.unitId,
            sourceLotId: item.sourceLotId || null,
            createdAt: now,
          }
        );

        if (!itemResult) {
          throw new Error('Failed to create inventory transfer item');
        }

        items.push(this.mapItemToEntity(itemResult));
      }

      return {
        ...this.mapToEntity(transferResult),
        items,
      };
    });
  }

  async findById(transferId: string): Promise<InventoryTransferWithDetails | null> {
    const transferQuery = `
      SELECT it.*, 
             ss.name as SourceStoreName, 
             ds.name as DestinationStoreName
      FROM InventoryTransfers it
      LEFT JOIN Stores ss ON it.SourceStoreId = ss.Id
      LEFT JOIN Stores ds ON it.DestinationStoreId = ds.Id
      WHERE it.Id = @transferId
    `;

    const transferResult = await queryOne<InventoryTransferRecord & { 
      SourceStoreName: string | null; 
      DestinationStoreName: string | null;
    }>(transferQuery, { transferId });

    if (!transferResult) {
      return null;
    }

    const itemsQuery = `
      SELECT iti.*, 
             p.name as ProductName, 
             u.name as UnitName
      FROM InventoryTransferItems iti
      LEFT JOIN Products p ON iti.ProductId = p.id
      LEFT JOIN Units u ON iti.UnitId = u.id
      WHERE iti.TransferId = @transferId
    `;

    const itemsResult = await query<InventoryTransferItemRecord & { 
      ProductName: string | null; 
      UnitName: string | null;
    }>(itemsQuery, { transferId });

    return {
      ...this.mapToEntity(transferResult),
      sourceStoreName: transferResult.SourceStoreName || undefined,
      destinationStoreName: transferResult.DestinationStoreName || undefined,
      items: itemsResult.map(item => ({
        ...this.mapItemToEntity(item),
        productName: item.ProductName || undefined,
        unitName: item.UnitName || undefined,
      })),
    };
  }

  async findByStore(
    storeId: string, 
    type: 'source' | 'destination' | 'both' = 'both',
    options?: PaginationOptions
  ): Promise<PaginatedResult<InventoryTransfer & { sourceStoreName?: string; destinationStoreName?: string; itemCount: number }>> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let whereClause: string;
    if (type === 'source') {
      whereClause = 'it.SourceStoreId = @storeId';
    } else if (type === 'destination') {
      whereClause = 'it.DestinationStoreId = @storeId';
    } else {
      whereClause = '(it.SourceStoreId = @storeId OR it.DestinationStoreId = @storeId)';
    }

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM InventoryTransfers it 
      WHERE ${whereClause}
    `;
    const countResult = await queryOne<{ total: number }>(countQuery, { storeId });
    const total = countResult?.total ?? 0;

    const orderBy = options?.orderBy || 'it.TransferDate';
    const direction = options?.orderDirection || 'DESC';

    const dataQuery = `
      SELECT it.*, 
             ss.name as SourceStoreName, 
             ds.name as DestinationStoreName,
             (SELECT COUNT(*) FROM InventoryTransferItems WHERE TransferId = it.Id) as ItemCount
      FROM InventoryTransfers it
      LEFT JOIN Stores ss ON it.SourceStoreId = ss.Id
      LEFT JOIN Stores ds ON it.DestinationStoreId = ds.Id
      WHERE ${whereClause}
      ORDER BY ${orderBy} ${direction}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;

    const results = await query<InventoryTransferRecord & { 
      SourceStoreName: string | null; 
      DestinationStoreName: string | null;
      ItemCount: number;
    }>(dataQuery, { storeId, offset, pageSize });

    return {
      data: results.map(r => ({
        ...this.mapToEntity(r),
        sourceStoreName: r.SourceStoreName || undefined,
        destinationStoreName: r.DestinationStoreName || undefined,
        itemCount: r.ItemCount,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getItems(transferId: string): Promise<InventoryTransferItemWithProduct[]> {
    const queryString = `
      SELECT iti.*, 
             p.name as ProductName, 
             u.name as UnitName
      FROM InventoryTransferItems iti
      LEFT JOIN Products p ON iti.ProductId = p.id
      LEFT JOIN Units u ON iti.UnitId = u.id
      WHERE iti.TransferId = @transferId
    `;

    const results = await query<InventoryTransferItemRecord & { 
      ProductName: string | null; 
      UnitName: string | null;
    }>(queryString, { transferId });

    return results.map(item => ({
      ...this.mapItemToEntity(item),
      productName: item.ProductName || undefined,
      unitName: item.UnitName || undefined,
    }));
  }
}

export const inventoryTransferRepository = new InventoryTransferRepository();
