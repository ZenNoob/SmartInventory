import { BaseRepository, QueryOptions, PaginationOptions, PaginatedResult } from './base-repository';
import { query, queryOne } from '../db';
import { withTransaction, transactionQuery, transactionQueryOne, transactionInsert, transactionUpdate } from '../db/transaction';

/**
 * Shift entity interface
 */
export interface Shift {
  id: string;
  storeId: string;
  userId: string;
  userName: string;
  status: 'active' | 'closed';
  startTime: string;
  endTime?: string;
  startingCash: number;
  endingCash?: number;
  cashSales: number;
  cashPayments: number;
  totalCashInDrawer?: number;
  cashDifference?: number;
  totalRevenue: number;
  salesCount: number;
}

/**
 * Shift with summary info
 */
export interface ShiftWithSummary extends Shift {
  calculatedCashInDrawer: number;
  calculatedCashDifference: number;
}

/**
 * Input for creating a shift
 */
export interface CreateShiftInput {
  userId: string;
  userName: string;
  startingCash: number;
}

/**
 * Input for closing a shift
 */
export interface CloseShiftInput {
  endingCash: number;
}

/**
 * Database record interface
 */
interface ShiftRecord {
  Id: string;
  StoreId: string;
  UserId: string;
  UserName: string | null;
  Status: string;
  StartTime: Date;
  EndTime: Date | null;
  StartingCash: number;
  EndingCash: number | null;
  CashSales: number;
  CashPayments: number;
  TotalCashInDrawer: number | null;
  CashDifference: number | null;
  TotalRevenue: number;
  SalesCount: number;
}

/**
 * Shift repository for managing shift operations
 * Extends BaseRepository with store-scoped CRUD operations
 */
export class ShiftRepository extends BaseRepository<Shift> {
  constructor() {
    super('Shifts', 'Id');
  }

  /**
   * Map database record to Shift entity
   */
  protected mapToEntity(record: Record<string, unknown>): Shift {
    const r = record as ShiftRecord;
    return {
      id: r.Id,
      storeId: r.StoreId,
      userId: r.UserId,
      userName: r.UserName || '',
      status: (r.Status as 'active' | 'closed') || 'active',
      startTime: r.StartTime instanceof Date ? r.StartTime.toISOString() : String(r.StartTime),
      endTime: r.EndTime instanceof Date ? r.EndTime.toISOString() : (r.EndTime ? String(r.EndTime) : undefined),
      startingCash: r.StartingCash || 0,
      endingCash: r.EndingCash ?? undefined,
      cashSales: r.CashSales || 0,
      cashPayments: r.CashPayments || 0,
      totalCashInDrawer: r.TotalCashInDrawer ?? undefined,
      cashDifference: r.CashDifference ?? undefined,
      totalRevenue: r.TotalRevenue || 0,
      salesCount: r.SalesCount || 0,
    };
  }

  /**
   * Map Shift entity to database record
   */
  protected mapToRecord(entity: Partial<Shift>): Record<string, unknown> {
    const record: Record<string, unknown> = {};
    
    if (entity.id !== undefined) record.Id = entity.id;
    if (entity.storeId !== undefined) record.StoreId = entity.storeId;
    if (entity.userId !== undefined) record.UserId = entity.userId;
    if (entity.userName !== undefined) record.UserName = entity.userName || null;
    if (entity.status !== undefined) record.Status = entity.status;
    if (entity.startTime !== undefined) record.StartTime = new Date(entity.startTime);
    if (entity.endTime !== undefined) record.EndTime = entity.endTime ? new Date(entity.endTime) : null;
    if (entity.startingCash !== undefined) record.StartingCash = entity.startingCash;
    if (entity.endingCash !== undefined) record.EndingCash = entity.endingCash ?? null;
    if (entity.cashSales !== undefined) record.CashSales = entity.cashSales;
    if (entity.cashPayments !== undefined) record.CashPayments = entity.cashPayments;
    if (entity.totalCashInDrawer !== undefined) record.TotalCashInDrawer = entity.totalCashInDrawer ?? null;
    if (entity.cashDifference !== undefined) record.CashDifference = entity.cashDifference ?? null;
    if (entity.totalRevenue !== undefined) record.TotalRevenue = entity.totalRevenue;
    if (entity.salesCount !== undefined) record.SalesCount = entity.salesCount;
    
    return record;
  }

  /**
   * Get active shift for a user in a store
   */
  async getActiveShift(userId: string, storeId: string): Promise<Shift | null> {
    const queryString = `
      SELECT * FROM Shifts 
      WHERE UserId = @userId AND StoreId = @storeId AND Status = 'active'
    `;

    const result = await queryOne<ShiftRecord>(queryString, { userId, storeId });
    return result ? this.mapToEntity(result as Record<string, unknown>) : null;
  }

  /**
   * Get any active shift for a store (regardless of user)
   */
  async getAnyActiveShift(storeId: string): Promise<Shift | null> {
    const queryString = `
      SELECT TOP 1 * FROM Shifts 
      WHERE StoreId = @storeId AND Status = 'active'
      ORDER BY StartTime DESC
    `;

    const result = await queryOne<ShiftRecord>(queryString, { storeId });
    return result ? this.mapToEntity(result as Record<string, unknown>) : null;
  }

  /**
   * Start a new shift
   */
  async startShift(input: CreateShiftInput, storeId: string): Promise<Shift> {
    // Check for existing active shift for this user
    const existingShift = await this.getActiveShift(input.userId, storeId);
    if (existingShift) {
      throw new Error('Bạn đã có một ca làm việc đang hoạt động.');
    }

    const shiftId = crypto.randomUUID();
    const now = new Date();

    const shiftRecord: Record<string, unknown> = {
      Id: shiftId,
      StoreId: storeId,
      UserId: input.userId,
      UserName: input.userName,
      Status: 'active',
      StartTime: now,
      EndTime: null,
      StartingCash: input.startingCash,
      EndingCash: null,
      CashSales: 0,
      CashPayments: 0,
      TotalCashInDrawer: null,
      CashDifference: null,
      TotalRevenue: 0,
      SalesCount: 0,
    };

    const result = await query<ShiftRecord>(
      `INSERT INTO Shifts (Id, StoreId, UserId, UserName, Status, StartTime, EndTime, StartingCash, EndingCash, CashSales, CashPayments, TotalCashInDrawer, CashDifference, TotalRevenue, SalesCount)
       OUTPUT INSERTED.*
       VALUES (@Id, @StoreId, @UserId, @UserName, @Status, @StartTime, @EndTime, @StartingCash, @EndingCash, @CashSales, @CashPayments, @TotalCashInDrawer, @CashDifference, @TotalRevenue, @SalesCount)`,
      shiftRecord
    );

    if (!result || result.length === 0) {
      throw new Error('Failed to create shift');
    }

    return this.mapToEntity(result[0] as Record<string, unknown>);
  }

  /**
   * Close a shift with ending cash and calculate differences
   */
  async closeShift(shiftId: string, input: CloseShiftInput, storeId: string): Promise<ShiftWithSummary> {
    return withTransaction(async (transaction) => {
      // Get the shift
      const shiftResult = await transactionQueryOne<ShiftRecord>(
        transaction,
        `SELECT * FROM Shifts WHERE Id = @shiftId AND StoreId = @storeId`,
        { shiftId, storeId }
      );

      if (!shiftResult) {
        throw new Error('Không tìm thấy ca làm việc.');
      }

      if (shiftResult.Status === 'closed') {
        throw new Error('Ca làm việc này đã được đóng.');
      }

      // Calculate totals from sales in this shift
      const salesSummary = await transactionQueryOne<{
        TotalRevenue: number;
        SalesCount: number;
        CashSales: number;
      }>(
        transaction,
        `SELECT 
          ISNULL(SUM(FinalAmount), 0) as TotalRevenue,
          COUNT(*) as SalesCount,
          ISNULL(SUM(CustomerPayment), 0) as CashSales
         FROM Sales 
         WHERE ShiftId = @shiftId AND StoreId = @storeId`,
        { shiftId, storeId }
      );

      // Calculate totals from customer payments in this shift period
      const paymentsSummary = await transactionQueryOne<{ CashPayments: number }>(
        transaction,
        `SELECT ISNULL(SUM(Amount), 0) as CashPayments
         FROM Payments 
         WHERE StoreId = @storeId 
           AND PaymentDate >= @startTime 
           AND PaymentDate <= @endTime`,
        { 
          storeId, 
          startTime: shiftResult.StartTime,
          endTime: new Date()
        }
      );

      const totalRevenue = salesSummary?.TotalRevenue || 0;
      const salesCount = salesSummary?.SalesCount || 0;
      const cashSales = salesSummary?.CashSales || 0;
      const cashPayments = paymentsSummary?.CashPayments || 0;

      // Calculate theoretical cash in drawer
      const totalCashInDrawer = shiftResult.StartingCash + cashSales + cashPayments;
      const cashDifference = input.endingCash - totalCashInDrawer;

      const now = new Date();

      // Update the shift
      await transactionQuery(
        transaction,
        `UPDATE Shifts 
         SET Status = 'closed',
             EndTime = @endTime,
             EndingCash = @endingCash,
             CashSales = @cashSales,
             CashPayments = @cashPayments,
             TotalCashInDrawer = @totalCashInDrawer,
             CashDifference = @cashDifference,
             TotalRevenue = @totalRevenue,
             SalesCount = @salesCount
         WHERE Id = @shiftId AND StoreId = @storeId`,
        {
          shiftId,
          storeId,
          endTime: now,
          endingCash: input.endingCash,
          cashSales,
          cashPayments,
          totalCashInDrawer,
          cashDifference,
          totalRevenue,
          salesCount,
        }
      );

      // Get updated shift
      const updatedShift = await transactionQueryOne<ShiftRecord>(
        transaction,
        `SELECT * FROM Shifts WHERE Id = @shiftId`,
        { shiftId }
      );

      if (!updatedShift) {
        throw new Error('Failed to retrieve updated shift');
      }

      const shift = this.mapToEntity(updatedShift as Record<string, unknown>);

      return {
        ...shift,
        calculatedCashInDrawer: totalCashInDrawer,
        calculatedCashDifference: cashDifference,
      };
    });
  }

  /**
   * Get shift with calculated summary
   */
  async getShiftWithSummary(shiftId: string, storeId: string): Promise<ShiftWithSummary | null> {
    const shift = await this.findById(shiftId, storeId);
    if (!shift) {
      return null;
    }

    // Calculate current totals from sales
    const salesSummary = await queryOne<{
      TotalRevenue: number;
      SalesCount: number;
      CashSales: number;
    }>(
      `SELECT 
        ISNULL(SUM(FinalAmount), 0) as TotalRevenue,
        COUNT(*) as SalesCount,
        ISNULL(SUM(CustomerPayment), 0) as CashSales
       FROM Sales 
       WHERE ShiftId = @shiftId AND StoreId = @storeId`,
      { shiftId, storeId }
    );

    const cashSales = salesSummary?.CashSales || 0;
    const cashPayments = shift.cashPayments || 0;
    const calculatedCashInDrawer = shift.startingCash + cashSales + cashPayments;
    const calculatedCashDifference = shift.endingCash !== undefined 
      ? shift.endingCash - calculatedCashInDrawer 
      : 0;

    return {
      ...shift,
      totalRevenue: salesSummary?.TotalRevenue || shift.totalRevenue,
      salesCount: salesSummary?.SalesCount || shift.salesCount,
      cashSales,
      calculatedCashInDrawer,
      calculatedCashDifference,
    };
  }

  /**
   * Get all shifts with pagination and filtering
   */
  async findAllShifts(
    storeId: string,
    options?: PaginationOptions & {
      userId?: string;
      status?: 'active' | 'closed';
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<PaginatedResult<Shift>> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
    const conditions: string[] = ['StoreId = @storeId'];
    const params: Record<string, unknown> = { storeId };

    if (options?.userId) {
      conditions.push('UserId = @userId');
      params.userId = options.userId;
    }

    if (options?.status) {
      conditions.push('Status = @status');
      params.status = options.status;
    }

    if (options?.dateFrom) {
      conditions.push('StartTime >= @dateFrom');
      params.dateFrom = new Date(options.dateFrom);
    }

    if (options?.dateTo) {
      conditions.push('StartTime <= @dateTo');
      params.dateTo = new Date(options.dateTo);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM Shifts WHERE ${whereClause}`;
    const countResult = await queryOne<{ total: number }>(countQuery, params);
    const total = countResult?.total ?? 0;

    // Get paginated results
    const orderBy = options?.orderBy || 'StartTime';
    const direction = options?.orderDirection || 'DESC';

    const dataQuery = `
      SELECT * FROM Shifts
      WHERE ${whereClause}
      ORDER BY ${orderBy} ${direction}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;

    const results = await query<ShiftRecord>(dataQuery, { ...params, offset, pageSize });

    return {
      data: results.map(r => this.mapToEntity(r as Record<string, unknown>)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update shift totals (called when a sale is made)
   */
  async updateShiftTotals(
    shiftId: string,
    storeId: string,
    saleAmount: number,
    customerPayment: number
  ): Promise<void> {
    await query(
      `UPDATE Shifts 
       SET TotalRevenue = ISNULL(TotalRevenue, 0) + @saleAmount,
           SalesCount = ISNULL(SalesCount, 0) + 1,
           CashSales = ISNULL(CashSales, 0) + @customerPayment
       WHERE Id = @shiftId AND StoreId = @storeId AND Status = 'active'`,
      { shiftId, storeId, saleAmount, customerPayment }
    );
  }

  /**
   * Revert shift totals (called when a sale is deleted)
   */
  async revertShiftTotals(
    shiftId: string,
    storeId: string,
    saleAmount: number,
    customerPayment: number
  ): Promise<void> {
    await query(
      `UPDATE Shifts 
       SET TotalRevenue = ISNULL(TotalRevenue, 0) - @saleAmount,
           SalesCount = ISNULL(SalesCount, 0) - 1,
           CashSales = ISNULL(CashSales, 0) - @customerPayment
       WHERE Id = @shiftId AND StoreId = @storeId`,
      { shiftId, storeId, saleAmount, customerPayment }
    );
  }

  /**
   * Update shift with new starting/ending cash values
   */
  async updateShiftCash(
    shiftId: string,
    storeId: string,
    startingCash: number,
    endingCash?: number
  ): Promise<Shift> {
    // Get current shift to recalculate
    const shift = await this.findById(shiftId, storeId);
    if (!shift) {
      throw new Error('Không tìm thấy ca làm việc.');
    }

    const totalCashInDrawer = startingCash + (shift.cashSales || 0) + (shift.cashPayments || 0);
    const cashDifference = endingCash !== undefined ? endingCash - totalCashInDrawer : null;

    const result = await query<ShiftRecord>(
      `UPDATE Shifts 
       SET StartingCash = @startingCash,
           EndingCash = @endingCash,
           TotalCashInDrawer = @totalCashInDrawer,
           CashDifference = @cashDifference
       OUTPUT INSERTED.*
       WHERE Id = @shiftId AND StoreId = @storeId`,
      {
        shiftId,
        storeId,
        startingCash,
        endingCash: endingCash ?? null,
        totalCashInDrawer,
        cashDifference,
      }
    );

    if (!result || result.length === 0) {
      throw new Error('Failed to update shift');
    }

    return this.mapToEntity(result[0] as Record<string, unknown>);
  }
}

// Export singleton instance
export const shiftRepository = new ShiftRepository();
