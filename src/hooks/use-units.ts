'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '@/contexts/store-context';

export interface Unit {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  baseUnitId?: string;
  conversionFactor: number;
  baseUnitName?: string;
}

interface UseUnitsOptions {
  includeBaseUnit?: boolean;
  baseUnitsOnly?: boolean;
}

interface UseUnitsResult {
  units: Unit[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  unitsMap: Map<string, string>;
}

/**
 * Hook to fetch units from SQL Server API
 */
export function useUnits(options?: UseUnitsOptions): UseUnitsResult {
  const { currentStore } = useStore();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnits = useCallback(async () => {
    if (!currentStore?.id) {
      setUnits([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = new URL('/api/units', window.location.origin);
      url.searchParams.set('storeId', currentStore.id);
      if (options?.includeBaseUnit) {
        url.searchParams.set('includeBaseUnit', 'true');
      }
      if (options?.baseUnitsOnly) {
        url.searchParams.set('baseUnitsOnly', 'true');
      }

      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers: {
          'X-Store-Id': currentStore.id,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch units');
      }

      const data = await response.json();
      setUnits(data.units || []);
    } catch (err) {
      console.error('Error fetching units:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setUnits([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentStore?.id, options?.includeBaseUnit, options?.baseUnitsOnly]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // Create a map of unit ID to unit name for easy lookup
  const unitsMap = useMemo(() => {
    return units.reduce((map, unit) => {
      map.set(unit.id, unit.name);
      return map;
    }, new Map<string, string>());
  }, [units]);

  return {
    units,
    isLoading,
    error,
    refetch: fetchUnits,
    unitsMap,
  };
}

/**
 * Hook to get a single unit by ID
 */
export function useUnit(unitId: string | null): {
  unit: Unit | null;
  isLoading: boolean;
  error: string | null;
} {
  const { currentStore } = useStore();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId || !currentStore?.id) {
      setUnit(null);
      setIsLoading(false);
      return;
    }

    const fetchUnit = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/units/${unitId}?storeId=${currentStore.id}`,
          {
            credentials: 'include',
            headers: {
              'X-Store-Id': currentStore.id,
            },
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch unit');
        }

        const data = await response.json();
        setUnit(data.unit || null);
      } catch (err) {
        console.error('Error fetching unit:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setUnit(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnit();
  }, [unitId, currentStore?.id]);

  return { unit, isLoading, error };
}

/**
 * Hook to get base units only
 */
export function useBaseUnits(): UseUnitsResult {
  return useUnits({ baseUnitsOnly: true });
}
