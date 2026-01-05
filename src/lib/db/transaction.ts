import { getConnection, sql } from './connection';

export type TransactionCallback<T> = (transaction: sql.Transaction) => Promise<T>;

/**
 * Execute a callback within a database transaction
 * Automatically commits on success and rolls back on error
 * 
 * @param callback - Function to execute within the transaction
 * @returns The result of the callback function
 * @throws Error if the transaction fails (after rollback)
 */
export async function withTransaction<T>(
  callback: TransactionCallback<T>
): Promise<T> {
  const conn = await getConnection();
  const transaction = new sql.Transaction(conn);

  try {
    await transaction.begin();
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error('Transaction rollback failed:', rollbackError);
    }
    throw error;
  }
}

/**
 * Create a request object bound to a transaction
 * Use this to execute queries within a transaction
 * 
 * @param transaction - The active transaction
 * @returns A new request object bound to the transaction
 */
export function createTransactionRequest(transaction: sql.Transaction): sql.Request {
  return new sql.Request(transaction);
}

/**
 * Execute a parameterized query within a transaction
 * 
 * @param transaction - The active transaction
 * @param queryString - SQL query with @param placeholders
 * @param params - Object with parameter values
 * @returns Query result recordset
 */
export async function transactionQuery<T = Record<string, unknown>>(
  transaction: sql.Transaction,
  queryString: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  const request = createTransactionRequest(transaction);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });
  }

  const result = await request.query(queryString);
  return result.recordset as T[];
}

/**
 * Execute a parameterized query within a transaction and return single result
 * 
 * @param transaction - The active transaction
 * @param queryString - SQL query with @param placeholders
 * @param params - Object with parameter values
 * @returns Single record or null
 */
export async function transactionQueryOne<T = Record<string, unknown>>(
  transaction: sql.Transaction,
  queryString: string,
  params?: Record<string, unknown>
): Promise<T | null> {
  const results = await transactionQuery<T>(transaction, queryString, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Execute an INSERT within a transaction and return the inserted record
 * 
 * @param transaction - The active transaction
 * @param tableName - Name of the table
 * @param data - Object with column values
 * @param returnColumns - Columns to return (default: all)
 * @returns Inserted record
 */
export async function transactionInsert<T = Record<string, unknown>>(
  transaction: sql.Transaction,
  tableName: string,
  data: Record<string, unknown>,
  returnColumns: string[] = ['*']
): Promise<T | null> {
  const columns = Object.keys(data);
  const paramNames = columns.map(col => `@${col}`);
  const returnClause = returnColumns.join(', ');

  const queryString = `
    INSERT INTO ${tableName} (${columns.join(', ')})
    OUTPUT INSERTED.${returnClause}
    VALUES (${paramNames.join(', ')})
  `;

  return transactionQueryOne<T>(transaction, queryString, data);
}

/**
 * Execute an UPDATE within a transaction and return the updated record
 * 
 * @param transaction - The active transaction
 * @param tableName - Name of the table
 * @param id - Record ID
 * @param data - Object with column values to update
 * @param idColumn - Name of the ID column (default: 'Id')
 * @param returnColumns - Columns to return (default: all)
 * @returns Updated record
 */
export async function transactionUpdate<T = Record<string, unknown>>(
  transaction: sql.Transaction,
  tableName: string,
  id: string,
  data: Record<string, unknown>,
  idColumn: string = 'Id',
  returnColumns: string[] = ['*']
): Promise<T | null> {
  const setClauses = Object.keys(data)
    .filter(key => key !== idColumn)
    .map(col => `${col} = @${col}`)
    .join(', ');

  const returnClause = returnColumns.join(', ');

  const queryString = `
    UPDATE ${tableName}
    SET ${setClauses}
    OUTPUT INSERTED.${returnClause}
    WHERE ${idColumn} = @${idColumn}
  `;

  return transactionQueryOne<T>(transaction, queryString, { ...data, [idColumn]: id });
}

export { sql };
