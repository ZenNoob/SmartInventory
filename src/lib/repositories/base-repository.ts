import {
  query,
  queryOne,
  insert,
  update,
  remove,
  SqlValue,
  QueryParams,
} from '../db';
import { sql } from '../db/connection';
import {
  withTransaction,
  transactionQuery,
  transactionQueryOne,
  transactionInsert,
  transactionUpdate,
} from '../db/transaction';

/**
 * Query options for repository methods
 */
export interface QueryOptions {
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  where?: Record<string, SqlValue>;
}

/**
 * Pagination options
 */
export interface PaginationOptions extends QueryOptions {
  page?: number;
  pageSize?: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Base repository class with CRUD operations
 * Implements automatic storeId filtering and pagination support
 * Uses snake_case column names to match database schema
 */
export abstract class BaseRepository<
  T extends { id?: string; storeId?: string },
> {
  protected tableName: string;
  protected idColumn: string;

  constructor(tableName: string, idColumn: string = 'id') {
    this.tableName = tableName;
    this.idColumn = idColumn;
  }

  /**
   * Map database record to entity (override in subclass for custom mapping)
   */
  protected mapToEntity(record: Record<string, unknown>): T {
    return record as T;
  }

  /**
   * Map entity to database record (override in subclass for custom mapping)
   */
  protected mapToRecord(entity: Partial<T>): Record<string, SqlValue> {
    return entity as Record<string, SqlValue>;
  }

  /**
   * Build WHERE clause with storeId filtering (using snake_case)
   */
  protected buildWhereClause(
    storeId: string,
    additionalConditions?: Record<string, SqlValue>
  ): { clause: string; params: QueryParams } {
    const conditions: string[] = ['store_id = @storeId'];
    const params: QueryParams = { storeId };

    if (additionalConditions) {
      Object.entries(additionalConditions).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          conditions.push(`${key} = @${key}`);
          params[key] = value;
        }
      });
    }

    return {
      clause: conditions.join(' AND '),
      params,
    };
  }

  /**
   * Find all records for a store with optional filtering and ordering
   */
  async findAll(storeId: string, options?: QueryOptions): Promise<T[]> {
    const { clause, params } = this.buildWhereClause(storeId, options?.where);

    let queryString = `SELECT * FROM ${this.tableName} WHERE ${clause}`;

    if (options?.orderBy) {
      const direction = options.orderDirection || 'ASC';
      queryString += ` ORDER BY ${options.orderBy} ${direction}`;
    }

    const results = await query<Record<string, unknown>>(queryString, params);
    return results.map((record) => this.mapToEntity(record));
  }

  /**
   * Find all records with pagination support
   */
  async findAllPaginated(
    storeId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const { clause, params } = this.buildWhereClause(storeId, options?.where);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE ${clause}`;
    const countResult = await queryOne<{ total: number }>(countQuery, params);
    const total = countResult?.total ?? 0;

    // Build paginated query
    let queryString = `SELECT * FROM ${this.tableName} WHERE ${clause}`;

    const orderBy = options?.orderBy || 'created_at';
    const direction = options?.orderDirection || 'DESC';
    queryString += ` ORDER BY ${orderBy} ${direction}`;
    queryString += ` OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

    const results = await query<Record<string, unknown>>(queryString, {
      ...params,
      offset,
      pageSize,
    });

    return {
      data: results.map((record) => this.mapToEntity(record)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Find a single record by ID with storeId filtering
   */
  async findById(id: string, storeId: string): Promise<T | null> {
    const queryString = `
      SELECT * FROM ${this.tableName} 
      WHERE ${this.idColumn} = @id AND store_id = @storeId
    `;

    const result = await queryOne<Record<string, unknown>>(queryString, {
      id,
      storeId,
    });
    return result ? this.mapToEntity(result) : null;
  }

  /**
   * Find records by a specific field value
   */
  async findBy(
    field: string,
    value: SqlValue,
    storeId: string,
    options?: QueryOptions
  ): Promise<T[]> {
    const { clause, params } = this.buildWhereClause(storeId, {
      ...options?.where,
      [field]: value,
    });

    let queryString = `SELECT * FROM ${this.tableName} WHERE ${clause}`;

    if (options?.orderBy) {
      const direction = options.orderDirection || 'ASC';
      queryString += ` ORDER BY ${options.orderBy} ${direction}`;
    }

    const results = await query<Record<string, unknown>>(queryString, params);
    return results.map((record) => this.mapToEntity(record));
  }

  /**
   * Find a single record by a specific field value
   */
  async findOneBy(
    field: string,
    value: SqlValue,
    storeId: string
  ): Promise<T | null> {
    const queryString = `
      SELECT * FROM ${this.tableName} 
      WHERE ${field} = @value AND store_id = @storeId
    `;

    const result = await queryOne<Record<string, unknown>>(queryString, {
      value,
      storeId,
    });
    return result ? this.mapToEntity(result) : null;
  }

  /**
   * Create a new record with automatic storeId assignment
   */
  async create(data: Partial<T>, storeId: string): Promise<T> {
    const record = this.mapToRecord({
      ...data,
      storeId,
    } as Partial<T>);

    // Add id if not provided (generate UUID)
    if (!record.id) {
      record.id = crypto.randomUUID();
    }

    // Ensure store_id is set
    record.store_id = storeId;

    // Add timestamps
    const now = new Date();
    if (!record.created_at) {
      record.created_at = now;
    }
    if (!record.updated_at) {
      record.updated_at = now;
    }

    const result = await insert<Record<string, unknown>>(this.tableName, record);
    if (!result) {
      throw new Error(`Failed to create record in ${this.tableName}`);
    }

    return this.mapToEntity(result);
  }

  /**
   * Update an existing record with storeId verification
   */
  async update(id: string, data: Partial<T>, storeId: string): Promise<T> {
    // Verify record belongs to store
    const existing = await this.findById(id, storeId);
    if (!existing) {
      throw new Error(`Record not found or access denied`);
    }

    const record = this.mapToRecord(data);

    // Remove storeId from update data (shouldn't be changed)
    delete record.store_id;
    delete record.storeId;

    // Update timestamp
    record.updated_at = new Date();

    const result = await update<Record<string, unknown>>(
      this.tableName,
      id,
      record,
      this.idColumn
    );

    if (!result) {
      throw new Error(`Failed to update record in ${this.tableName}`);
    }

    return this.mapToEntity(result);
  }

  /**
   * Delete a record with storeId verification
   */
  async delete(id: string, storeId: string): Promise<boolean> {
    // Verify record belongs to store
    const existing = await this.findById(id, storeId);
    if (!existing) {
      throw new Error(`Record not found or access denied`);
    }

    return remove(this.tableName, id, this.idColumn);
  }

  /**
   * Check if a record exists
   */
  async exists(id: string, storeId: string): Promise<boolean> {
    const queryString = `
      SELECT 1 FROM ${this.tableName} 
      WHERE ${this.idColumn} = @id AND store_id = @storeId
    `;

    const result = await queryOne<{ '': number }>(queryString, { id, storeId });
    return result !== null;
  }

  /**
   * Count records for a store
   */
  async count(
    storeId: string,
    where?: Record<string, SqlValue>
  ): Promise<number> {
    const { clause, params } = this.buildWhereClause(storeId, where);
    const queryString = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE ${clause}`;

    const result = await queryOne<{ total: number }>(queryString, params);
    return result?.total ?? 0;
  }

  /**
   * Search records with LIKE query
   */
  async search(
    storeId: string,
    searchField: string,
    searchTerm: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const { clause, params } = this.buildWhereClause(storeId, options?.where);
    const searchClause = `${clause} AND ${searchField} LIKE @searchTerm`;
    const searchParams = { ...params, searchTerm: `%${searchTerm}%` };

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE ${searchClause}`;
    const countResult = await queryOne<{ total: number }>(
      countQuery,
      searchParams
    );
    const total = countResult?.total ?? 0;

    // Build paginated query
    let queryString = `SELECT * FROM ${this.tableName} WHERE ${searchClause}`;

    const orderBy = options?.orderBy || 'created_at';
    const direction = options?.orderDirection || 'DESC';
    queryString += ` ORDER BY ${orderBy} ${direction}`;
    queryString += ` OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

    const results = await query<Record<string, unknown>>(queryString, {
      ...searchParams,
      offset,
      pageSize,
    });

    return {
      data: results.map((record) => this.mapToEntity(record)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Execute operations within a transaction
   */
  async withTransaction<R>(
    callback: (repo: TransactionRepository<T>) => Promise<R>
  ): Promise<R> {
    return withTransaction(async (transaction) => {
      const transactionRepo = new TransactionRepository<T>(
        this.tableName,
        this.idColumn,
        transaction,
        this.mapToEntity.bind(this),
        this.mapToRecord.bind(this)
      );
      return callback(transactionRepo);
    });
  }
}

/**
 * Transaction-aware repository for use within withTransaction callback
 */
export class TransactionRepository<
  T extends { id?: string; storeId?: string },
> {
  private tableName: string;
  private idColumn: string;
  private transaction: sql.Transaction;
  private mapToEntity: (record: Record<string, unknown>) => T;
  private mapToRecord: (entity: Partial<T>) => Record<string, SqlValue>;

  constructor(
    tableName: string,
    idColumn: string,
    transaction: sql.Transaction,
    mapToEntity: (record: Record<string, unknown>) => T,
    mapToRecord: (entity: Partial<T>) => Record<string, SqlValue>
  ) {
    this.tableName = tableName;
    this.idColumn = idColumn;
    this.transaction = transaction;
    this.mapToEntity = mapToEntity;
    this.mapToRecord = mapToRecord;
  }

  async findById(id: string, storeId: string): Promise<T | null> {
    const queryString = `
      SELECT * FROM ${this.tableName} 
      WHERE ${this.idColumn} = @id AND store_id = @storeId
    `;

    const result = await transactionQueryOne<Record<string, unknown>>(
      this.transaction,
      queryString,
      { id, storeId }
    );
    return result ? this.mapToEntity(result) : null;
  }

  async create(data: Partial<T>, storeId: string): Promise<T> {
    const record = this.mapToRecord({
      ...data,
      storeId,
    } as Partial<T>);

    if (!record.id) {
      record.id = crypto.randomUUID();
    }

    record.store_id = storeId;

    const now = new Date();
    if (!record.created_at) {
      record.created_at = now;
    }
    if (!record.updated_at) {
      record.updated_at = now;
    }

    const result = await transactionInsert<Record<string, unknown>>(
      this.transaction,
      this.tableName,
      record
    );

    if (!result) {
      throw new Error(`Failed to create record in ${this.tableName}`);
    }

    return this.mapToEntity(result);
  }

  async update(id: string, data: Partial<T>, storeId: string): Promise<T> {
    const existing = await this.findById(id, storeId);
    if (!existing) {
      throw new Error(`Record not found or access denied`);
    }

    const record = this.mapToRecord(data);
    delete record.store_id;
    delete record.storeId;
    record.updated_at = new Date();

    const result = await transactionUpdate<Record<string, unknown>>(
      this.transaction,
      this.tableName,
      id,
      record,
      this.idColumn
    );

    if (!result) {
      throw new Error(`Failed to update record in ${this.tableName}`);
    }

    return this.mapToEntity(result);
  }

  async query<R = Record<string, unknown>>(
    queryString: string,
    params?: Record<string, unknown>
  ): Promise<R[]> {
    return transactionQuery<R>(this.transaction, queryString, params);
  }

  async queryOne<R = Record<string, unknown>>(
    queryString: string,
    params?: Record<string, unknown>
  ): Promise<R | null> {
    return transactionQueryOne<R>(this.transaction, queryString, params);
  }
}
