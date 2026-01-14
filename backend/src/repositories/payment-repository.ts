import {
  BaseRepository,
  QueryOptions,
  PaginationOptions,
  PaginatedResult,
} from './base-repository';
import { query, queryOne } from '../db';

/**
 * Payment entity interface (matches database schema)
 */
export interface Payment {
  id: string;
  storeId: string;
  customerId: string;
  paymentDate: string;
  amount: number;
  notes?: string;
  createdAt?: string;
}

/**
 * Database record interface (snake_case)
 */
interface PaymentRecord {
  id: string;
  store_id: string;
  customer_id: string;
  payment_date: Date;
  amount: number;
  notes: string | null;
  created_at: Date;
}

/**
 * Payment repository for managing customer payments
 */
export class PaymentRepository extends BaseRepository<Payment> {
  constructor() {
    super('Payments', 'id');
  }

  /**
   * Map database record to Payment entity
   */
  protected mapToEntity(record: Record<string, unknown>): Payment {
    const r = record as unknown as PaymentRecord;
    return {
      id: r.id,
      storeId: r.store_id,
      customerId: r.customer_id,
      paymentDate: r.payment_date
        ? r.payment_date instanceof Date
          ? r.payment_date.toISOString()
          : String(r.payment_date)
        : new Date().toISOString(),
      amount: r.amount || 0,
      notes: r.notes || undefined,
      createdAt: r.created_at
        ? r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at)
        : undefined,
    };
  }

  /**
   * Find all payments for a store
   */
  async findAll(storeId: string, options?: QueryOptions): Promise<Payment[]> {
    let queryString = `SELECT * FROM Payments WHERE store_id = @storeId`;

    if (options?.orderBy) {
      const direction = options.orderDirection || 'DESC';
      queryString += ` ORDER BY ${options.orderBy} ${direction}`;
    } else {
      queryString += ` ORDER BY payment_date DESC`;
    }

    const results = await query<PaymentRecord>(queryString, { storeId });
    return results.map((r) => this.mapToEntity(r as unknown as Record<string, unknown>));
  }

  /**
   * Find payment by ID
   */
  async findById(id: string, storeId: string): Promise<Payment | null> {
    const result = await queryOne<PaymentRecord>(
      `SELECT * FROM Payments WHERE id = @id AND store_id = @storeId`,
      { id, storeId }
    );
    return result ? this.mapToEntity(result as unknown as Record<string, unknown>) : null;
  }

  /**
   * Find payments by customer
   */
  async findByCustomer(customerId: string, storeId: string): Promise<Payment[]> {
    const results = await query<PaymentRecord>(
      `SELECT * FROM Payments 
       WHERE store_id = @storeId AND customer_id = @customerId
       ORDER BY payment_date DESC`,
      { storeId, customerId }
    );
    return results.map((r) => this.mapToEntity(r as unknown as Record<string, unknown>));
  }

  /**
   * Find payments by date range
   */
  async findByDateRange(
    storeId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<Payment[]> {
    const results = await query<PaymentRecord>(
      `SELECT * FROM Payments 
       WHERE store_id = @storeId 
         AND payment_date >= @dateFrom 
         AND payment_date <= @dateTo
       ORDER BY payment_date DESC`,
      { storeId, dateFrom, dateTo }
    );
    return results.map((r) => this.mapToEntity(r as unknown as Record<string, unknown>));
  }

  /**
   * Create a new payment
   */
  async create(
    entity: Omit<Payment, 'id' | 'createdAt'>,
    storeId: string
  ): Promise<Payment> {
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO Payments (id, store_id, customer_id, payment_date, amount, notes, created_at)
       VALUES (@id, @storeId, @customerId, @paymentDate, @amount, @notes, GETDATE())`,
      {
        id,
        storeId,
        customerId: entity.customerId,
        paymentDate: new Date(entity.paymentDate),
        amount: entity.amount,
        notes: entity.notes || null,
      }
    );
    return this.findById(id, storeId) as Promise<Payment>;
  }

  /**
   * Delete a payment
   */
  async delete(id: string, storeId: string): Promise<boolean> {
    await query(`DELETE FROM Payments WHERE id = @id AND store_id = @storeId`, {
      id,
      storeId,
    });
    return true;
  }

  /**
   * Get total payments for a customer
   */
  async getTotalPaymentsByCustomer(
    customerId: string,
    storeId: string
  ): Promise<number> {
    const result = await queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM Payments 
       WHERE store_id = @storeId AND customer_id = @customerId`,
      { storeId, customerId }
    );
    return result?.total ?? 0;
  }

  /**
   * Get total payments for a store
   */
  async getTotalPayments(
    storeId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<number> {
    let queryString = `SELECT COALESCE(SUM(amount), 0) as total FROM Payments WHERE store_id = @storeId`;
    const params: Record<string, unknown> = { storeId };

    if (dateFrom) {
      queryString += ` AND payment_date >= @dateFrom`;
      params.dateFrom = dateFrom;
    }
    if (dateTo) {
      queryString += ` AND payment_date <= @dateTo`;
      params.dateTo = dateTo;
    }

    const result = await queryOne<{ total: number }>(queryString, params);
    return result?.total ?? 0;
  }
}

// Export singleton instance
export const paymentRepository = new PaymentRepository();
