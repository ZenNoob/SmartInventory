import { BaseRepository, QueryOptions } from './base-repository';
import { query, queryOne } from '../db';

/**
 * Unit entity interface
 */
export interface Unit {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  baseUnitId?: string;
  conversionFactor: number;
}

/**
 * Unit with base unit info for display
 */
export interface UnitWithBaseUnit extends Unit {
  baseUnitName?: string;
}

/**
 * Database record interface for Units table (snake_case)
 */
interface UnitRecord {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  base_unit_id: string | null;
  conversion_factor: number;
}

/**
 * Unit repository for managing measurement units
 */
export class UnitRepository extends BaseRepository<Unit> {
  constructor() {
    super('Units', 'id');
  }

  /**
   * Map database record to Unit entity
   */
  protected mapToEntity(record: Record<string, unknown>): Unit {
    const r = record as UnitRecord;
    return {
      id: r.id,
      storeId: r.store_id,
      name: r.name,
      description: r.description || undefined,
      baseUnitId: r.base_unit_id || undefined,
      conversionFactor: r.conversion_factor ?? 1,
    };
  }

  /**
   * Map Unit entity to database record
   */
  protected mapToRecord(entity: Partial<Unit>): Record<string, unknown> {
    const record: Record<string, unknown> = {};

    if (entity.id !== undefined) record.id = entity.id;
    if (entity.storeId !== undefined) record.store_id = entity.storeId;
    if (entity.name !== undefined) record.name = entity.name;
    if (entity.description !== undefined)
      record.description = entity.description || null;
    if (entity.baseUnitId !== undefined)
      record.base_unit_id = entity.baseUnitId || null;
    if (entity.conversionFactor !== undefined)
      record.conversion_factor = entity.conversionFactor;

    return record;
  }

  /**
   * Find all units for a store
   */
  async findAll(storeId: string, options?: QueryOptions): Promise<Unit[]> {
    let queryString = `SELECT * FROM Units WHERE store_id = @storeId`;

    if (options?.orderBy) {
      const direction = options.orderDirection || 'ASC';
      queryString += ` ORDER BY ${options.orderBy} ${direction}`;
    } else {
      queryString += ` ORDER BY name ASC`;
    }

    const results = await query<UnitRecord>(queryString, { storeId });
    return results.map((r) => this.mapToEntity(r as Record<string, unknown>));
  }

  /**
   * Find unit by ID
   */
  async findById(id: string, storeId: string): Promise<Unit | null> {
    const result = await queryOne<UnitRecord>(
      `SELECT * FROM Units WHERE id = @id AND store_id = @storeId`,
      { id, storeId }
    );
    return result ? this.mapToEntity(result as Record<string, unknown>) : null;
  }

  /**
   * Find unit by name within a store
   */
  async findByName(name: string, storeId: string): Promise<Unit | null> {
    const result = await queryOne<UnitRecord>(
      `SELECT * FROM Units WHERE name = @name AND store_id = @storeId`,
      { name, storeId }
    );
    return result ? this.mapToEntity(result as Record<string, unknown>) : null;
  }

  /**
   * Check if unit name exists (for validation)
   */
  async nameExists(
    name: string,
    storeId: string,
    excludeId?: string
  ): Promise<boolean> {
    let queryString = `SELECT 1 FROM Units WHERE name = @name AND store_id = @storeId`;
    const params: Record<string, unknown> = { name, storeId };

    if (excludeId) {
      queryString += ` AND id != @excludeId`;
      params.excludeId = excludeId;
    }

    const result = await queryOne<{ '': number }>(queryString, params);
    return result !== null;
  }

  /**
   * Create a new unit
   */
  async create(
    entity: Omit<Unit, 'id'>,
    storeId: string
  ): Promise<Unit> {
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO Units (id, store_id, name, description, base_unit_id, conversion_factor, created_at, updated_at)
       VALUES (@id, @storeId, @name, @description, @baseUnitId, @conversionFactor, GETDATE(), GETDATE())`,
      {
        id,
        storeId,
        name: entity.name,
        description: entity.description || null,
        baseUnitId: entity.baseUnitId || null,
        conversionFactor: entity.conversionFactor ?? 1,
      }
    );
    return this.findById(id, storeId) as Promise<Unit>;
  }

  /**
   * Update a unit
   */
  async update(
    id: string,
    entity: Partial<Unit>,
    storeId: string
  ): Promise<Unit | null> {
    const existing = await this.findById(id, storeId);
    if (!existing) return null;

    await query(
      `UPDATE Units SET 
        name = @name, 
        description = @description, 
        base_unit_id = @baseUnitId,
        conversion_factor = @conversionFactor,
        updated_at = GETDATE()
       WHERE id = @id AND store_id = @storeId`,
      {
        id,
        storeId,
        name: entity.name ?? existing.name,
        description: entity.description ?? existing.description ?? null,
        baseUnitId: entity.baseUnitId ?? existing.baseUnitId ?? null,
        conversionFactor: entity.conversionFactor ?? existing.conversionFactor,
      }
    );

    return this.findById(id, storeId);
  }

  /**
   * Delete a unit
   */
  async delete(id: string, storeId: string): Promise<boolean> {
    await query(`DELETE FROM Units WHERE id = @id AND store_id = @storeId`, {
      id,
      storeId,
    });
    return true;
  }

  /**
   * Get all units with base unit information
   */
  async findAllWithBaseUnit(
    storeId: string,
    options?: QueryOptions
  ): Promise<UnitWithBaseUnit[]> {
    let queryString = `
      SELECT u.*, bu.name as base_unit_name
      FROM Units u
      LEFT JOIN Units bu ON u.base_unit_id = bu.id
      WHERE u.store_id = @storeId
    `;

    if (options?.orderBy) {
      const direction = options.orderDirection || 'ASC';
      queryString += ` ORDER BY u.${options.orderBy} ${direction}`;
    } else {
      queryString += ` ORDER BY u.name ASC`;
    }

    const results = await query<UnitRecord & { base_unit_name: string | null }>(
      queryString,
      { storeId }
    );

    return results.map((r) => ({
      ...this.mapToEntity(r as Record<string, unknown>),
      baseUnitName: r.base_unit_name || undefined,
    }));
  }

  /**
   * Get base units only (units without a base unit reference)
   */
  async findBaseUnits(storeId: string): Promise<Unit[]> {
    const results = await query<UnitRecord>(
      `SELECT * FROM Units WHERE store_id = @storeId AND base_unit_id IS NULL ORDER BY name ASC`,
      { storeId }
    );
    return results.map((r) => this.mapToEntity(r as Record<string, unknown>));
  }

  /**
   * Convert quantity from one unit to another
   */
  async convertQuantity(
    quantity: number,
    fromUnitId: string,
    toUnitId: string,
    storeId: string
  ): Promise<number | null> {
    const fromUnit = await this.findById(fromUnitId, storeId);
    const toUnit = await this.findById(toUnitId, storeId);

    if (!fromUnit || !toUnit) {
      return null;
    }

    if (fromUnitId === toUnitId) {
      return quantity;
    }

    const fromBaseId = fromUnit.baseUnitId || fromUnitId;
    const toBaseId = toUnit.baseUnitId || toUnitId;

    if (fromBaseId !== toBaseId) {
      return null;
    }

    const fromFactor = fromUnit.conversionFactor;
    const toFactor = toUnit.conversionFactor;
    const convertedQuantity = (quantity * fromFactor) / toFactor;

    return convertedQuantity;
  }
}

// Export singleton instance
export const unitRepository = new UnitRepository();
