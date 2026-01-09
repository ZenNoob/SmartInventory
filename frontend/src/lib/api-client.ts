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
      user: { id: string; email: string; displayName?: string; role: string; permissions?: Record<string, string[]> };
      stores: string[];
      token: string;
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
    } finally {
      this.setToken(null);
      this.setStoreId(null);
    }
  }

  async getMe() {
    return this.request<{
      user: { id: string; email: string; displayName?: string; role: string; permissions?: Record<string, string[]> };
      stores: string[];
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
  async getCashFlow() {
    return this.request<Array<Record<string, unknown>>>('/cash-flow');
  }

  async createCashTransaction(data: Record<string, unknown>) {
    return this.request('/cash-flow', { method: 'POST', body: data });
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
    return this.request<Array<Record<string, unknown>>>('/stores');
  }

  async getAllStores() {
    return this.request<Array<Record<string, unknown>>>('/stores/all');
  }

  async getStore(id: string) {
    return this.request<Record<string, unknown>>(`/stores/${id}`);
  }

  async createStore(data: Record<string, unknown>) {
    return this.request('/stores', { method: 'POST', body: data });
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

  // ==================== Online Store ====================
  async getOnlineStores() {
    return this.request<Array<Record<string, unknown>>>('/online-stores');
  }

  async getAllOnlineStores() {
    return this.request<Array<Record<string, unknown>>>('/online-stores/all');
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
}

export const apiClient = new ApiClient();
export default apiClient;
