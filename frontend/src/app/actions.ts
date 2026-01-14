'use client';

import { apiClient } from '@/lib/api-client';

/**
 * Login user
 */
export async function login(email: string, password: string): Promise<{
  success: boolean;
  user?: Record<string, unknown>;
  stores?: Array<string | { storeId: string; storeName: string; storeCode: string; roleOverride?: string }>;
  error?: string;
}> {
  try {
    const result = await apiClient.login(email, password);
    return { 
      success: true, 
      user: result.user as Record<string, unknown>,
      stores: result.stores,
    };
  } catch (error: unknown) {
    console.error('Error logging in:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đăng nhập thất bại' 
    };
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.logout();
    return { success: true };
  } catch (error: unknown) {
    console.error('Error logging out:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đăng xuất thất bại' 
    };
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<{
  success: boolean;
  user?: Record<string, unknown>;
  stores?: Array<string | { storeId: string; storeName: string; storeCode: string; roleOverride?: string }>;
  error?: string;
}> {
  try {
    const result = await apiClient.getMe();
    return { 
      success: true, 
      user: result.user as Record<string, unknown>,
      stores: result.stores,
    };
  } catch (error: unknown) {
    console.error('Error getting current user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Không thể lấy thông tin người dùng' 
    };
  }
}

/**
 * Set current store
 */
export function setCurrentStore(storeId: string): void {
  apiClient.setStoreId(storeId);
}

/**
 * Get stores for current user
 */
export async function getStores(): Promise<{
  success: boolean;
  stores?: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const stores = await apiClient.getStores();
    return { success: true, stores: stores as unknown as Array<Record<string, unknown>> };
  } catch (error: unknown) {
    console.error('Error fetching stores:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lấy danh sách cửa hàng' 
    };
  }
}

/**
 * Get sales forecast (placeholder)
 */
export async function getSalesForecast(
  productId: string,
  days: number
): Promise<{
  success: boolean;
  forecast?: Array<{ date: string; quantity: number }>;
  error?: string;
}> {
  // Placeholder - return mock data
  const forecast = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    forecast.push({
      date: date.toISOString().split('T')[0],
      quantity: Math.floor(Math.random() * 10) + 1,
    });
  }
  return { success: true, forecast };
}

/**
 * Get product info suggestion (placeholder for AI feature)
 */
export async function getProductInfoSuggestion(
  productName: string
): Promise<{
  success: boolean;
  suggestion?: Record<string, unknown>;
  error?: string;
}> {
  // Placeholder - return empty suggestion
  return {
    success: true,
    suggestion: {
      description: `Mô tả cho ${productName}`,
      category: '',
    },
  };
}


/**
 * Get customer segments (placeholder for analytics feature)
 */
export async function getCustomerSegments(
  _params?: Record<string, unknown>
): Promise<{
  success: boolean;
  segments?: Array<Record<string, unknown>>;
  data?: Array<Record<string, unknown>>;
  error?: string;
}> {
  // Placeholder - return mock data
  const segments = [
    { name: 'VIP', count: 10, revenue: 50000000 },
    { name: 'Thường xuyên', count: 50, revenue: 100000000 },
    { name: 'Mới', count: 100, revenue: 20000000 },
  ];
  return {
    success: true,
    segments,
    data: segments,
  };
}

/**
 * Get market basket analysis (placeholder for analytics feature)
 */
export async function getMarketBasketAnalysis(
  _params?: Record<string, unknown>
): Promise<{
  success: boolean;
  analysis?: Array<Record<string, unknown>>;
  data?: Array<Record<string, unknown>>;
  error?: string;
}> {
  // Placeholder - return mock data
  const analysis = [
    { products: ['Sản phẩm A', 'Sản phẩm B'], support: 0.15, confidence: 0.8 },
    { products: ['Sản phẩm C', 'Sản phẩm D'], support: 0.12, confidence: 0.75 },
  ];
  return {
    success: true,
    analysis,
    data: analysis,
  };
}


/**
 * Get debt risk prediction (placeholder for AI feature)
 */
export async function getDebtRiskPrediction(
  _input: string | Record<string, unknown>
): Promise<{
  success: boolean;
  prediction?: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    factors: string[];
    recommendations: string[];
  };
  data?: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    factors: string[];
    recommendations: string[];
  };
  error?: string;
}> {
  // Placeholder - return mock data
  const result = {
    riskLevel: 'low' as const,
    riskScore: 0.2,
    factors: [],
    recommendations: [],
  };
  return {
    success: true,
    prediction: result,
    data: result,
  };
}

/**
 * Get related products suggestion (placeholder for AI feature)
 */
export async function getRelatedProductsSuggestion(
  _input: string[] | Record<string, unknown>
): Promise<{
  success: boolean;
  suggestions?: Array<{
    productId: string;
    productName: string;
    relevanceScore: number;
    reason: string;
  }>;
  error?: string;
}> {
  // Placeholder - return empty suggestions
  return {
    success: true,
    suggestions: [],
  };
}
