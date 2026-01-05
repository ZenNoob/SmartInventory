/**
 * API client utility that automatically includes store ID in requests
 */

type FetchOptions = RequestInit & {
  storeId?: string;
};

/**
 * Fetch wrapper that automatically adds store ID header
 */
export async function apiFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { storeId, headers, ...rest } = options;

  const requestHeaders: HeadersInit = {
    ...headers,
  };

  if (storeId) {
    (requestHeaders as Record<string, string>)['X-Store-Id'] = storeId;
  }

  return fetch(url, {
    ...rest,
    headers: requestHeaders,
    credentials: 'include',
  });
}

/**
 * GET request with store ID
 */
export async function apiGet<T>(
  url: string,
  storeId?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await apiFetch(url, { storeId });
    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'Request failed' };
    }

    return { success: true, data: json.data || json.customers || json };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * POST request with store ID
 */
export async function apiPost<T>(
  url: string,
  body: unknown,
  storeId?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      storeId,
    });
    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'Request failed' };
    }

    return { success: true, data: json };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * PUT request with store ID
 */
export async function apiPut<T>(
  url: string,
  body: unknown,
  storeId?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await apiFetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      storeId,
    });
    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'Request failed' };
    }

    return { success: true, data: json };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * DELETE request with store ID
 */
export async function apiDelete(
  url: string,
  storeId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await apiFetch(url, {
      method: 'DELETE',
      storeId,
    });
    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'Request failed' };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
