/**
 * Transaction Support for SQL Server
 * 
 * Provides transaction management utilities for atomic database operations.
 */

import sql from 'mssql';
import { getConnection } from './connection';

export { sql };

/**
 * Execute a function within a database transaction
 * Automatically commits on success or rolls back on error
 */
export async function withTransaction<T>(
  fn: (transaction: sql.Transaction) => Promise<T>
): Promise<T> {
  const pool = await getConnection();
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    const result = await fn(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Execute a query within a transaction
 */
export async function transactionQuery<T = Record<string, unknown>>(
  transaction: sql.Transaction,
  queryString: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  const request = new sql.Request(transaction);
  
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value as sql.ISqlType);
    }
  }
  
  const result = await request.query(queryString);
  return result.recordset as T[];
}

/**
 * Execute a query and return single result within a transaction
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
 * Execute an insert within a transaction
 * Can accept either a query string or table name with data
 */
export async function transactionInsert<T = Record<string, unknown>>(
  transaction: sql.Transaction,
  tableNameOrQuery: string,
  dataOrParams?: Record<string, unknown>
): Promise<T | null> {
  const request = new sql.Request(transaction);
  
  // Check if it's a table name (no spaces) or a query
  const isTableName = !tableNameOrQuery.includes(' ');
  
  let finalQuery: string;
  
  if (isTableName && dataOrParams) {
    // Table-based insert
    const columns = Object.keys(dataOrParams);
    const paramNames = columns.map(col => `@${col}`);
    
    for (const [key, value] of Object.entries(dataOrParams)) {
      request.input(key, value as sql.ISqlType);
    }
    
    finalQuery = `
      INSERT INTO ${tableNameOrQuery} (${columns.join(', ')})
      OUTPUT INSERTED.*
      VALUES (${paramNames.join(', ')})
    `;
  } else {
    // Query-based insert
    if (dataOrParams) {
      for (const [key, value] of Object.entries(dataOrParams)) {
        request.input(key, value as sql.ISqlType);
      }
    }
    
    finalQuery = tableNameOrQuery;
    if (!tableNameOrQuery.toLowerCase().includes('output inserted')) {
      finalQuery = tableNameOrQuery.replace(
        /\)\s*values/i,
        ') OUTPUT INSERTED.* VALUES'
      );
    }
  }
  
  const result = await request.query(finalQuery);
  return result.recordset?.[0] as T || null;
}

/**
 * Execute an update within a transaction
 * Can accept either a query string or table name with data
 */
export async function transactionUpdate<T = Record<string, unknown>>(
  transaction: sql.Transaction,
  tableNameOrQuery: string,
  idOrParams: string | Record<string, unknown>,
  dataOrIdColumn?: Record<string, unknown> | string,
  idColumn: string = 'id'
): Promise<T | null> {
  const request = new sql.Request(transaction);
  
  // Check if it's a table name (no spaces) or a query
  const isTableName = !tableNameOrQuery.includes(' ');
  
  let finalQuery: string;
  
  if (isTableName && typeof idOrParams === 'string' && typeof dataOrIdColumn === 'object') {
    // Table-based update: transactionUpdate(tx, 'TableName', id, data, idColumn)
    const id = idOrParams;
    const data = dataOrIdColumn;
    const actualIdColumn = typeof arguments[4] === 'string' ? arguments[4] : 'id';
    
    const setClauses = Object.keys(data)
      .filter(key => key !== actualIdColumn && key !== 'id')
      .map(col => `${col} = @${col}`)
      .join(', ');
    
    for (const [key, value] of Object.entries(data)) {
      request.input(key, value as sql.ISqlType);
    }
    request.input('_id', id);
    
    finalQuery = `
      UPDATE ${tableNameOrQuery}
      SET ${setClauses}
      OUTPUT INSERTED.*
      WHERE ${actualIdColumn} = @_id
    `;
  } else if (typeof idOrParams === 'object') {
    // Query-based update with params
    for (const [key, value] of Object.entries(idOrParams)) {
      request.input(key, value as sql.ISqlType);
    }
    finalQuery = tableNameOrQuery;
  } else {
    finalQuery = tableNameOrQuery;
  }
  
  const result = await request.query(finalQuery);
  return result.recordset?.[0] as T || null;
}
