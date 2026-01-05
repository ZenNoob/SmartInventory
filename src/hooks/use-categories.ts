'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/contexts/store-context';

export interface Category {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  productCount?: number;
}

interface UseCategoriesOptions {
  includeProductCount?: boolean;
}

interface UseCategoriesResult {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch categories from SQL Server API
 */
export function useCategories(options?: UseCategoriesOptions): UseCategoriesResult {
  const { currentStore } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!currentStore?.id) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = new URL('/api/categories', window.location.origin);
      url.searchParams.set('storeId', currentStore.id);
      if (options?.includeProductCount) {
        url.searchParams.set('includeProductCount', 'true');
      }

      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers: {
          'X-Store-Id': currentStore.id,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch categories');
      }

      const data = await response.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentStore?.id, options?.includeProductCount]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories,
  };
}

/**
 * Hook to get a single category by ID
 */
export function useCategory(categoryId: string | null): {
  category: Category | null;
  isLoading: boolean;
  error: string | null;
} {
  const { currentStore } = useStore();
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId || !currentStore?.id) {
      setCategory(null);
      setIsLoading(false);
      return;
    }

    const fetchCategory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/categories/${categoryId}?storeId=${currentStore.id}`,
          {
            credentials: 'include',
            headers: {
              'X-Store-Id': currentStore.id,
            },
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch category');
        }

        const data = await response.json();
        setCategory(data.category || null);
      } catch (err) {
        console.error('Error fetching category:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setCategory(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategory();
  }, [categoryId, currentStore?.id]);

  return { category, isLoading, error };
}
