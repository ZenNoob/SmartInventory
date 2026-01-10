// Hardcode API URL for now - env var not loading properly
const API_URL = 'http://localhost:3001/api';

// Debug: log API URL
if (typeof window !== 'undefined') {
  console.log('API_URL:', API_URL);
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiError extends Error {
  status?: number;
}

// Store types
export interface Store {
  id: string;
  ownerId: string;
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  businessType?: string;
  domain?: string;
  status: 'active' | 'inactive';
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreRequest {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  businessType?: string;
}

export interface UpdateStoreRequest {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  businessType?: string;
  status?: 'active' | 'inactive';
}

class ApiClient {
  private token: string | null = null;
  private storeId: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  setStoreId(storeId: string | null) {
    this.storeId = storeId;
    if (typeof window !== 'undefined') {
      if (storeId) {
        localStorage.setItem('store_id', storeId);
      } else {
        localStorage.removeItem('store_id');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  getStoreId(): string | null {
    if (this.storeId) return this.storeId;
    if (typeof window !== 'undefined') {
      this.storeId = localStorage.getItem('store_id');
    }
    return this.storeId;
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const token = this.getToken();
    const storeId = this.getStoreId();

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    if (storeId) {
      requestHeaders['X-Store-Id'] = storeId;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      const error: ApiError = new Error(errorData.error || 'Request failed');
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  // ==================== Auth ====================
  async login(email: string, password: string) {
    const result = await this.request<{
      user: { 
        id: string; 
        email: string; 
        displayName?: string; 
        role: string; 
        permissions?: Record<string, string[]>;
        tenantId?: string;
        tenantUserId?: string;
      };
      tenant?: {
        id: string;
        name: string;
        slug: string;
      };
      stores: Array<string | { storeId: string; storeName: string; storeCode: string; roleOverride?: string }>;
      token: string;
      expiresAt?: string;
    }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    this.setToken(result.token);
    return result;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout errors - session may already be invalid
    } finally {
      this.setToken(null);
      this.setStoreId(null);
    }
  }

  async getMe() {
    return this.request<{
      user: { 
        id: string; 
        email: string; 
        displayName?: string; 
        role: string; 
        permissions?: Record<string, string[]>;
        tenantId?: string;
        tenantUserId?: string;
      };
      tenant?: {
        id: string;
        name: string;
        slug: string;
      };
      stores: Array<string | { storeId: string; storeName: string; storeCode: string; roleOverride?: string }>;
    }>('/auth/me');
  }

  // ==================== Categories ====================
  async getCategories() {
    return this.request<Array<{ id: string; name: string; description?: string }>>('/categories');
  }

  async getCategory(id: string) {
    return this.request<{ id: string; name: string; description?: string }>(`/categories/${id}`);
  }

  async createCategory(data: { name: string; description?: string }) {
    return this.request<{ id: string; name: string; description?: string }>('/categories', { 
      method: 'POST', 
      body: data 
    });
  }

  async updateCategory(id: string, data: { name?: string; description?: string }) {
    return this.request<{ id: string; name: string; description?: string }>(`/categories/${id}`, { 
      method: 'PUT', 
      body: data 
    });
  }

  async deleteCategory(id: string) {
    return this.request<{ success: boolean }>(`/categories/${id}`, { method: 'DELETE' });
  }

  // ==================== Units ====================
  async getUnits() {
    return this.request<Array<{ id: string; name: string; description?: string; baseUnitId?: string; conversionFactor?: number }>>('/units');
  }

  async getUnit(id: string) {
    return this.request<{ id: string; name: string; description?: string }>(`/units/${id}`);
  }

  async createUnit(data: { name: string; description?: string; baseUnitId?: string; conversionFactor?: number }) {
    return this.request('/units', { method: 'POST', body: data });
  }

  async updateUnit(id: string, data: { name?: string; description?: string; baseUnitId?: string; conversionFactor?: number }) {
    return this.request(`/units/${id}`, { method: 'PUT', body: data });
  }

  async deleteUnit(id: string) {
    return this.request<{ success: boolean }>(`/units/${id}`, { method: 'DELETE' });
  }

  // ==================== Products ====================
  async getProducts() {
    return this.request<Array<Record<string, unknown>>>('/products');
  }

  async getProduct(id: string) {
    return this.request<Record<string, unknown>>(`/products/${id}`);
  }

  async createProduct(data: Record<string, unknown>) {
    return this.request('/products', { method: 'POST', body: data });
  }

  async updateProduct(id: string, data: Record<string, unknown>) {
    return this.request(`/products/${id}`, { method: 'PUT', body: data });
  }

  async deleteProduct(id: string) {
    return this.request<{ success: boolean }>(`/products/${id}`, { method: 'DELETE' });
  }

  // ==================== Customers ====================
  async getCustomers() {
    return this.request<Array<Record<string, unknown>>>('/customers');
  }

  async getCustomer(id: string) {
    return this.request<Record<string, unknown>>(`/customers/${id}`);
  }

  async createCustomer(data: Record<string, unknown>) {
    return this.request('/customers', { method: 'POST', body: data });
  }

  async updateCustomer(id: string, data: Record<string, unknown>) {
    return this.request(`/customers/${id}`, { method: 'PUT', body: data });
  }

  async deleteCustomer(id: string) {
    return this.request<{ success: boolean }>(`/customers/${id}`, { method: 'DELETE' });
  }

  // ==================== Suppliers ====================
  async getSuppliers() {
    return this.request<Array<Record<string, unknown>>>('/suppliers');
  }

  async getSupplier(id: string) {
    return this.request<Record<string, unknown>>(`/suppliers/${id}`);
  }

  async createSupplier(data: Record<string, unknown>) {
    return this.request('/suppliers', { method: 'POST', body: data });
  }

  async updateSupplier(id: string, data: Record<string, unknown>) {
    return this.request(`/suppliers/${id}`, { method: 'PUT', body: data });
  }

  async deleteSupplier(id: string) {
    return this.request<{ success: boolean }>(`/suppliers/${id}`, { method: 'DELETE' });
  }

  // ==================== Sales ====================
  async getSales() {
    return this.request<Array<Record<string, unknown>>>('/sales');
  }

  async getSale(id: string) {
    return this.request<Record<string, unknown>>(`/sales/${id}`);
  }

  async createSale(data: Record<string, unknown>) {
    return this.request('/sales', { method: 'POST', body: data });
  }

  async updateSale(id: string, data: Record<string, unknown>) {
    return this.request(`/sales/${id}`, { method: 'PUT', body: data });
  }

  async deleteSale(id: string) {
    return this.request<{ success: boolean }>(`/sales/${id}`, { method: 'DELETE' });
  }

  // ==================== Purchases ====================
  async getPurchases() {
    return this.request<Array<Record<string, unknown>>>('/purchases');
  }

  async getPurchase(id: string) {
    return this.request<Record<string, unknown>>(`/purchases/${id}`);
  }

  async createPurchase(data: Record<string, unknown>) {
    return this.request('/purchases', { method: 'POST', body: data });
  }

  async updatePurchase(id: string, data: Record<string, unknown>) {
    return this.request(`/purchases/${id}`, { method: 'PUT', body: data });
  }

  async deletePurchase(id: string) {
    return this.request<{ success: boolean }>(`/purchases/${id}`, { method: 'DELETE' });
  }

  // ==================== Shifts ====================
  async getShifts() {
    return this.request<Array<Record<string, unknown>>>('/shifts');
  }

  async getActiveShift() {
    return this.request<Record<string, unknown> | null>('/shifts/active');
  }

  async startShift(data: { startingCash: number }) {
    return this.request('/shifts/start', { method: 'POST', body: data });
  }

  async closeShift(id: string, data: { endingCash: number }) {
    return this.request(`/shifts/${id}/close`, { method: 'POST', body: data });
  }

  // ==================== Cash Flow ====================
  async getCashFlow(params?: { 
    page?: number; 
    pageSize?: number; 
    type?: 'thu' | 'chi'; 
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    includeSummary?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params?.type) searchParams.set('type', params.type);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
    if (params?.includeSummary) searchParams.set('includeSummary', 'true');
    const query = searchParams.toString();
    return this.request<Record<string, unknown>>(`/cash-flow${query ? `?${query}` : ''}`);
  }

  async getCashFlowSummary(params?: { dateFrom?: string; dateTo?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
    const query = searchParams.toString();
    return this.request<Record<string, unknown>>(`/cash-flow/summary${query ? `?${query}` : ''}`);
  }

  async getCashFlowCategories() {
    return this.request<string[]>('/cash-flow/categories');
  }

  async getCashTransaction(id: string) {
    return this.request<Record<string, unknown>>(`/cash-flow/${id}`);
  }

  async createCashTransaction(data: Record<string, unknown>) {
    return this.request('/cash-flow', { method: 'POST', body: data });
  }

  async updateCashTransaction(id: string, data: Record<string, unknown>) {
    return this.request(`/cash-flow/${id}`, { method: 'PUT', body: data });
  }

  async deleteCashTransaction(id: string) {
    return this.request<{ success: boolean }>(`/cash-flow/${id}`, { method: 'DELETE' });
  }

  // ==================== Payments ====================
  async getPayments() {
    return this.request<Array<Record<string, unknown>>>('/payments');
  }

  async createPayment(data: Record<string, unknown>) {
    return this.request('/payments', { method: 'POST', body: data });
  }

  async getSupplierPayments() {
    return this.request<Array<Record<string, unknown>>>('/supplier-payments');
  }

  async createSupplierPayment(data: Record<string, unknown>) {
    return this.request('/supplier-payments', { method: 'POST', body: data });
  }

  // ==================== Settings ====================
  async getSettings() {
    return this.request<Record<string, unknown>>('/settings');
  }

  async updateSettings(data: Record<string, unknown>) {
    return this.request('/settings', { method: 'PUT', body: data });
  }

  // ==================== Stores ====================
  async getStores() {
    return this.request<Array<Store>>('/stores');
  }

  async syncStores() {
    return this.request<{ success: boolean; message: string; stores: Array<Store>; addedStores: string[] }>(
      '/stores/sync',
      { method: 'POST' }
    );
  }

  async getStore(id: string) {
    return this.request<Store>(`/stores/${id}`);
  }

  async createStore(data: CreateStoreRequest) {
    return this.request<Store>('/stores', { method: 'POST', body: data });
  }

  async updateStore(id: string, data: UpdateStoreRequest) {
    return this.request<Store>(`/stores/${id}`, { method: 'PUT', body: data });
  }

  async deleteStore(id: string) {
    return this.request<Store>(`/stores/${id}`, { method: 'DELETE' });
  }

  async deleteStorePermanently(id: string) {
    return this.request<{ success: boolean; message: string; deletedData?: { products: number; orders: number; customers: number } }>(
      `/stores/${id}/permanent?confirm=true`, 
      { method: 'DELETE' }
    );
  }

  // ==================== Users ====================
  async getUsers() {
    return this.request<Array<Record<string, unknown>>>('/users');
  }

  async getUser(id: string) {
    return this.request<Record<string, unknown>>(`/users/${id}`);
  }

  async createUser(data: Record<string, unknown>) {
    return this.request('/users', { method: 'POST', body: data });
  }

  async updateUser(id: string, data: Record<string, unknown>) {
    return this.request(`/users/${id}`, { method: 'PUT', body: data });
  }

  async deleteUser(id: string) {
    return this.request<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' });
  }

  async assignUserStores(userId: string, storeIds: string[]) {
    return this.request<{ success: boolean; assignedStores: string[] }>(`/users/${userId}/stores`, {
      method: 'POST',
      body: { storeIds },
    });
  }

  // ==================== Reports ====================
  async getRevenueReport(from: string, to: string) {
    return this.request(`/reports/revenue?from=${from}&to=${to}`);
  }

  async getSalesReport(params?: { dateFrom?: string; dateTo?: string; includeDetails?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
    if (params?.includeDetails) searchParams.set('includeDetails', 'true');
    const query = searchParams.toString();
    return this.request(`/reports/sales${query ? `?${query}` : ''}`);
  }

  async getInventoryReport(params?: { categoryId?: string; lowStockOnly?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.lowStockOnly) searchParams.set('lowStockOnly', 'true');
    const query = searchParams.toString();
    return this.request(`/reports/inventory${query ? `?${query}` : ''}`);
  }

  async getDebtReport(params?: { hasDebtOnly?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params?.hasDebtOnly !== undefined) searchParams.set('hasDebtOnly', String(params.hasDebtOnly));
    const query = searchParams.toString();
    return this.request(`/reports/debt${query ? `?${query}` : ''}`);
  }

  async getSupplierDebtReport() {
    return this.request('/reports/supplier-debt');
  }

  async getProfitReport(params: { dateFrom: string; dateTo: string; groupBy?: string }) {
    const searchParams = new URLSearchParams();
    searchParams.set('dateFrom', params.dateFrom);
    searchParams.set('dateTo', params.dateTo);
    if (params.groupBy) searchParams.set('groupBy', params.groupBy);
    return this.request(`/reports/profit?${searchParams.toString()}`);
  }

  async getSoldProductsReport(from: string, to: string) {
    return this.request(`/reports/sold-products?from=${from}&to=${to}`);
  }

  // ==================== Sale Items ====================
  async getSaleItems(saleId: string) {
    return this.request<Array<Record<string, unknown>>>(`/sales/${saleId}/items`);
  }

  async getAllSaleItems() {
    return this.request<Array<Record<string, unknown>>>('/sales/items/all');
  }

  // ==================== Online Store ====================
  async getOnlineStores() {
    return this.request<Array<Record<string, unknown>>>('/online-stores');
  }

  async getOnlineStore(id: string) {
    return this.request<Record<string, unknown>>(`/online-stores/${id}`);
  }

  async createOnlineStore(data: Record<string, unknown>) {
    return this.request('/online-stores', { method: 'POST', body: data });
  }

  async updateOnlineStore(id: string, data: Record<string, unknown>) {
    return this.request(`/online-stores/${id}`, { method: 'PUT', body: data });
  }

  async deleteOnlineStore(id: string) {
    return this.request<{ success: boolean }>(`/online-stores/${id}`, { method: 'DELETE' });
  }

  // Online Store Products
  async getOnlineStoreProducts(onlineStoreId: string) {
    return this.request<Array<Record<string, unknown>>>(`/online-stores/${onlineStoreId}/products`);
  }

  async addOnlineStoreProduct(onlineStoreId: string, data: Record<string, unknown>) {
    return this.request(`/online-stores/${onlineStoreId}/products`, { method: 'POST', body: data });
  }

  async updateOnlineStoreProduct(onlineStoreId: string, productId: string, data: Record<string, unknown>) {
    return this.request(`/online-stores/${onlineStoreId}/products/${productId}`, { method: 'PUT', body: data });
  }

  async deleteOnlineStoreProduct(onlineStoreId: string, productId: string) {
    return this.request<{ success: boolean }>(`/online-stores/${onlineStoreId}/products/${productId}`, { method: 'DELETE' });
  }

  async syncOnlineStoreProducts(onlineStoreId: string, data?: { categoryId?: string }) {
    return this.request<{ success: boolean; synced: number; skipped: number; total: number; message: string }>(
      `/online-stores/${onlineStoreId}/sync`, 
      { method: 'POST', body: data || {} }
    );
  }

  // ==================== Storefront (Public) ====================
  async getStorefrontConfig(slug: string) {
    return this.request<{ store: Record<string, unknown> }>(`/storefront/${slug}/config`);
  }

  // ==================== Tenant Registration ====================
  async registerTenant(data: {
    businessName: string;
    businessEmail: string;
    businessPhone?: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    subscriptionPlan?: 'basic' | 'standard' | 'premium';
    defaultStoreName?: string;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      tenantId: string;
      tenantSlug: string;
    }>('/tenants/register', {
      method: 'POST',
      body: data,
    });
  }

  async getRegistrationStatus(tenantId: string) {
    return this.request<{
      status: 'pending' | 'creating_database' | 'running_migrations' | 'creating_owner' | 'creating_default_store' | 'completed' | 'failed';
      progress: number;
      message: string;
      error?: string;
      tenant?: {
        id: string;
        name: string;
        slug: string;
      };
    }>(`/tenants/register/status/${tenantId}`);
  }

  async checkBusinessEmail(email: string) {
    return this.request<{ available: boolean }>('/tenants/check-email', {
      method: 'POST',
      body: { email, type: 'business' },
    });
  }

  async checkOwnerEmail(email: string) {
    return this.request<{ available: boolean }>('/tenants/check-email', {
      method: 'POST',
      body: { email, type: 'owner' },
    });
  }

  async checkBusinessSlug(businessName: string) {
    return this.request<{ available: boolean; suggestedSlug: string }>('/tenants/check-slug', {
      method: 'POST',
      body: { businessName },
    });
  }

  async getStorefrontProducts(slug: string, params?: { category?: string; search?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return this.request<{ store: Record<string, unknown>; products: Array<Record<string, unknown>>; pagination: Record<string, unknown> }>(
      `/storefront/${slug}/products${query ? `?${query}` : ''}`
    );
  }

  async getStorefrontProduct(slug: string, productSlug: string) {
    return this.request<{ product: Record<string, unknown> }>(`/storefront/${slug}/products/${productSlug}`);
  }

  async getStorefrontCategories(slug: string) {
    return this.request<{ categories: Array<Record<string, unknown>> }>(`/storefront/${slug}/categories`);
  }

  async getStorefrontCart(slug: string, sessionId: string) {
    return this.request<{ cart: Record<string, unknown> }>(`/storefront/${slug}/cart`, {
      headers: { 'X-Session-Id': sessionId }
    });
  }

  async addToStorefrontCart(slug: string, sessionId: string, data: { productId: string; quantity?: number }) {
    return this.request<{ success: boolean; message: string }>(`/storefront/${slug}/cart/items`, {
      method: 'POST',
      body: data,
      headers: { 'X-Session-Id': sessionId }
    });
  }

  async storefrontCheckout(slug: string, sessionId: string, data: {
    customerEmail: string;
    customerName: string;
    customerPhone: string;
    shippingAddress: Record<string, unknown>;
    paymentMethod: string;
    customerNote?: string;
  }) {
    return this.request<{ success: boolean; order: Record<string, unknown> }>(`/storefront/${slug}/checkout`, {
      method: 'POST',
      body: data,
      headers: { 'X-Session-Id': sessionId }
    });
  }

  async getStorefrontOrder(slug: string, orderNumber: string) {
    return this.request<{ order: Record<string, unknown> }>(`/storefront/${slug}/orders/${orderNumber}`);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
