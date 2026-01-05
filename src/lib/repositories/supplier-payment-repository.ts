import { BaseRepository, QueryOptions, PaginationOptions, PaginatedResult } from './base-repository';
import { query, queryOne } from '../db';

/**
 * Supplier Payment entity interface
 */
export interface SupplierPayment {
  id: string;
  storeId: string;
  supplierId: string;
  paymentDate: string;
  amount: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

/**
 * Supplier Payment with supplier information
 */
export interface SupplierPaymentWithSupplier extends SupplierPayment {
  supplierName: string;
  supplierPhone?: string;
}

/**
 * Database record interface for SupplierPayments table
 */
interface SupplierPaymentRecord {
  Id: string;
  StoreId: string;
  SupplierId: string;
  PaymentDate: Date;
  Amount: number;
  Notes: string | null;
  CreatedBy: string | null;
  CreatedAt: Date;
}

/**
 * Supplier Payment repository for managing payments to suppliers
 * Extends BaseRepository with store-scoped CRUD operations
 */
export class SupplierPaymentRepository extends BaseRepository<SupplierPayment> {
  constructor() {
    super('SupplierPayments', 'Id');
  }

  /**
   * Map database record to SupplierPayment entity
   */
  protected mapToEntity(record: Record<string, unknown>): SupplierPayment {
    const r = record as SupplierPaymentRecord;
    return {
      id: r.Id,
      storeId: r.StoreId,
      supplierId: r.SupplierId,
      paymentDate: r.PaymentDate instanceof Date ? r.PaymentDate.toISOString() : String(r.PaymentDate),
      amount: r.Amount,
      notes: r.Notes || undefined,
      createdBy: r.CreatedBy || undefined,
      createdAt: r.CreatedAt instanceof Date ? r.CreatedAt.toISOString() : String(r.CreatedAt),
    };
  }

  /**
   * Map SupplierPayment entity to database record
   */
  protected mapToRecord(entity: Partial<SupplierPayment>): Record<string, unknown> {
    const record: Record<string, unknown> = {};
    
    if (entity.id !== undefined) record.Id = entity.id;
    if (entity.storeId !== undefined) record.StoreId = entity.storeId;
    if (entity.supplierId !== undefined) record.SupplierId = entity.supplierId;
    if (entity.paymentDate !== undefined) record.PaymentDate = new Date(entity.paymentDate);
    if (entity.amount !== undefined) record.Amount = entity.amount;
    if (entity.notes !== undefined) record.Notes = entity.notes || null;
    if (entity.createdBy !== undefined) record.CreatedBy = entity.createdBy || null;
    
    return record;
  }

  /**
   * Find payments by supplier
   */
  async findBySupplier(
    supplierId: string,
    storeId: string,
    options?: QueryOptions
  ): Promise<SupplierPayment[]> {
    let queryString = `
      SELECT * FROM SupplierPayments 
      WHERE SupplierId = @supplierId AND StoreId = @storeId
    `;
    
    if (options?.orderBy) {
      const direction = options.orderDirection || 'DESC';
      queryString += ` ORDER BY ${options.orderBy} ${direction}`;
    } else {
      queryString += ` ORDER BY PaymentDate DESC`;
    }
    
    const results = await query<SupplierPaymentRecord>(queryString, { supplierId, storeId });
    return results.map(r => this.mapToEntity(r as Record<string, unknown>));
  }

  /**
   * Find all payments with supplier information
   */
  async findAllWithSupplier(
    storeId: string,
    options?: PaginationOptions & {
      supplierId?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<PaginatedResult<SupplierPaymentWithSupplier>> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let whereClause = 'sp.StoreId = @storeId';
    const params: Record<string, unknown> = { storeId };

    if (options?.supplierId) {
      whereClause += ' AND sp.SupplierId = @supplierId';
      params.supplierId = options.supplierId;
    }

    if (options?.dateFrom) {
      whereClause += ' AND sp.PaymentDate >= @dateFrom';
      params.dateFrom = new Date(options.dateFrom);
    }

    if (options?.dateTo) {
      whereClause += ' AND sp.PaymentDate <= @dateTo';
      params.dateTo = new Date(options.dateTo);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM SupplierPayments sp WHERE ${whereClause}`;
    const countResult = await queryOne<{ total: number }>(countQuery, params);
    const total = countResult?.total ?? 0;

    // Get paginated results with supplier info
    const orderBy = options?.orderBy || 'sp.PaymentDate';
    const direction = options?.orderDirection || 'DESC';
    
    const dataQuery = `
      SELECT sp.*, s.Name as SupplierName, s.Phone as SupplierPhone
      FROM SupplierPayments sp
      LEFT JOIN Suppliers s ON sp.SupplierId = s.Id
      WHERE ${whereClause}
      ORDER BY ${orderBy} ${direction}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;

    const results = await query<SupplierPaymentRecord & { SupplierName: string; SupplierPhone: string | null }>(
      dataQuery,
      { ...params, offset, pageSize }
    );

    return {
      data: results.map(r => ({
        ...this.mapToEntity(r as Record<string, unknown>),
        supplierName: r.SupplierName,
        supplierPhone: r.SupplierPhone || undefined,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get total payments for a supplier
   */
  async getTotalPayments(supplierId: string, storeId: string): Promise<number> {
    const result = await queryOne<{ Total: number }>(
      `SELECT ISNULL(SUM(Amount), 0) as Total 
       FROM SupplierPayments 
       WHERE SupplierId = @supplierId AND StoreId = @storeId`,
      { supplierId, storeId }
    );
    return result?.Total ?? 0;
  }

  /**
   * Get payments summary by date range
   */
  async getPaymentsSummary(
    storeId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<{ totalAmount: number; count: number }> {
    const result = await queryOne<{ TotalAmount: number; Count: number }>(
      `SELECT 
         ISNULL(SUM(Amount), 0) as TotalAmount,
         COUNT(*) as Count
       FROM SupplierPayments 
       WHERE StoreId = @storeId 
         AND PaymentDate >= @dateFrom 
         AND PaymentDate <= @dateTo`,
      { storeId, dateFrom: new Date(dateFrom), dateTo: new Date(dateTo) }
    );
    return {
      totalAmount: result?.TotalAmount ?? 0,
      count: result?.Count ?? 0,
    };
  }
}

// Export singleton instance
export const supplierPaymentRepository = new SupplierPaymentRepository();
