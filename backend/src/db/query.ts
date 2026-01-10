import { getConnection, sql } from './connection';

export type SqlValue = string | number | boolean | Date | Buffer | null | undefined;
export type QueryParams = Record<string, SqlValue | unknown>;

/**
 * Execute a parameterized query and return results
 */
export async function query<T = Record<string, unknown>>(
  queryString: string,
  params?: QueryParams
): Promise<T[]> {
  const conn = await getConnection();
  const request = conn.request();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });
  }

  const result = await request.query(queryString);
  return result.recordset as T[];
}

/**
 * Execute a parameterized query and return a single result
 */
export async function queryOne<T = Record<string, unknown>>(
  queryString: string,
  params?: QueryParams
): Promise<T | null> {
  const results = await query<T>(queryString, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Execute an INSERT query and return the inserted record
 */
export async function insert<T = Record<string, unknown>>(
  tableName: string,
  data: Record<string, SqlValue>,
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

  return queryOne<T>(queryString, data);
}

/**
 * Execute an UPDATE query and return the updated record
 */
export async function update<T = Record<string, unknown>>(
  tableName: string,
  id: string,
  data: Record<string, SqlValue>,
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

  return queryOne<T>(queryString, { ...data, [idColumn]: id });
}

/**
 * Execute a DELETE query
 */
export async function remove(
  tableName: string,
  id: string,
  idColumn: string = 'Id'
): Promise<boolean> {
  const queryString = `DELETE FROM ${tableName} WHERE ${idColumn} = @id`;
  const conn = await getConnection();
  const request = conn.request();
  request.input('id', id);
  
  const result = await request.query(queryString);
  return (result.rowsAffected[0] ?? 0) > 0;
}

/**
 * Execute a query with pagination support
 */
export async function queryPaginated<T = Record<string, unknown>>(
  queryString: string,
  params: QueryParams = {},
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: T[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const offset = (page - 1) * pageSize;
  
  const countQuery = `SELECT COUNT(*) as total FROM (${queryString}) as countQuery`;
  const countResult = await queryOne<{ total: number }>(countQuery, params);
  const total = countResult?.total ?? 0;
  
  const paginatedQuery = `
    ${queryString}
    ORDER BY (SELECT NULL)
    OFFSET @offset ROWS
    FETCH NEXT @pageSize ROWS ONLY
  `;
  
  const data = await query<T>(paginatedQuery, {
    ...params,
    offset,
    pageSize,
  });

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export { sql };
