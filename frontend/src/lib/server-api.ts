import { cookies } from 'next/headers';

const API_URL = 'http://localhost:3001/api';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
  storeId?: string;
}

async function serverRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, token, storeId } = options;
  
  // Try to get from cookies first (if available)
  let authToken = token;
  let currentStoreId = storeId;
  
  if (!authToken || !currentStoreId) {
    try {
      const cookieStore = await cookies();
      authToken = authToken || cookieStore.get('auth_token')?.value;
      currentStoreId = currentStoreId || cookieStore.get('store_id')?.value;
    } catch {
      // Cookies might not be available in all contexts
    }
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (authToken) {
    requestHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  if (currentStoreId) {
    requestHeaders['X-Store-Id'] = currentStoreId;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store', // Disable caching for dynamic data
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || 'Request failed');
  }

  return response.json();
}

// Server-side API functions
export async function getCustomerServer(customerId: string, token?: string, storeId?: string) {
  return serverRequest<Record<string, unknown>>(`/customers/${customerId}`, { token, storeId });
}

export async function getCustomersServer(token?: string, storeId?: string) {
  return serverRequest<Array<Record<string, unknown>>>('/customers', { token, storeId });
}
