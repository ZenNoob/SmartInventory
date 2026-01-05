'use server';

import {
  ThemeSettings,
  Customer,
  Payment,
  LoyaltySettings,
  Sale,
  SalesItem,
  PurchaseOrder,
  Product,
} from '@/lib/types';
import { cookies } from 'next/headers';
import * as xlsx from 'xlsx';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  const storeId = cookieStore.get('current-store-id')?.value;

  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(storeId && { 'X-Store-Id': storeId }),
    Cookie: `auth-token=${token || ''}`,
  };
}

export async function upsertThemeSettings(
  settings: Partial<ThemeSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const authHeaders = await getAuthHeaders();
    const baseUrl = getBaseUrl();

    const response = await fetch(`${baseUrl}/api/settings`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(settings),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Không thể cập nhật cài đặt giao diện.',
      };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error upserting theme settings:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật cài đặt giao diện.',
    };
  }
}

export async function getThemeSettings(): Promise<ThemeSettings | null> {
  try {
    const authHeaders = await getAuthHeaders();
    const baseUrl = getBaseUrl();

    const response = await fetch(`${baseUrl}/api/settings`, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.settings as ThemeSettings | null;
  } catch (error) {
    console.error('Error getting theme settings:', error);
    return null;
  }
}

export async function recalculateAllLoyaltyPoints(): Promise<{
  success: boolean;
  error?: string;
  processedCount?: number;
}> {
  try {
    const authHeaders = await getAuthHeaders();
    const baseUrl = getBaseUrl();

    const settingsResponse = await fetch(`${baseUrl}/api/settings`, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!settingsResponse.ok) {
      return { success: false, error: 'Không thể lấy cài đặt hệ thống.' };
    }

    const settingsData = await settingsResponse.json();
    const loyaltySettings = settingsData.settings?.loyalty as
      | LoyaltySettings
      | undefined;

    if (
      !loyaltySettings ||
      !loyaltySettings.pointsPerAmount ||
      loyaltySettings.pointsPerAmount <= 0
    ) {
      return {
        success: false,
        error:
          'Chưa cấu hình chương trình khách hàng thân thiết hoặc tỷ lệ tích điểm không hợp lệ.',
      };
    }

    const customersResponse = await fetch(
      `${baseUrl}/api/customers?limit=10000`,
      {
        method: 'GET',
        headers: authHeaders,
      }
    );

    if (!customersResponse.ok) {
      return { success: false, error: 'Không thể lấy danh sách khách hàng.' };
    }

    const customersData = await customersResponse.json();
    const customers = customersData.customers || [];

    const paymentsResponse = await fetch(
      `${baseUrl}/api/payments?limit=10000`,
      {
        method: 'GET',
        headers: authHeaders,
      }
    );

    if (!paymentsResponse.ok) {
      return { success: false, error: 'Không thể lấy danh sách thanh toán.' };
    }

    const paymentsData = await paymentsResponse.json();
    const payments = paymentsData.payments || [];

    const paymentsByCustomer = new Map<string, number>();
    payments.forEach((payment: Payment) => {
      const currentTotal = paymentsByCustomer.get(payment.customerId) || 0;
      paymentsByCustomer.set(payment.customerId, currentTotal + payment.amount);
    });

    const sortedTiers = loyaltySettings.tiers.sort(
      (a, b) => b.threshold - a.threshold
    );
    let processedCount = 0;

    for (const customer of customers) {
      const totalPaid = paymentsByCustomer.get(customer.id) || 0;
      const newPoints = Math.floor(totalPaid / loyaltySettings.pointsPerAmount);
      const newTier = sortedTiers.find((tier) => newPoints >= tier.threshold);
      const newTierName = newTier?.name || undefined;

      if (
        customer.lifetimePoints !== newPoints ||
        customer.loyaltyTier !== newTierName
      ) {
        await fetch(`${baseUrl}/api/customers/${customer.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({
            lifetimePoints: newPoints,
            loyaltyTier: newTierName,
          }),
        });
      }
      processedCount++;
    }

    return { success: true, processedCount };
  } catch (error: unknown) {
    console.error('Error recalculating loyalty points:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Không thể tính toán lại điểm khách hàng.',
    };
  }
}

export async function deleteAllTransactionalData(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const authHeaders = await getAuthHeaders();
    const baseUrl = getBaseUrl();

    // Delete sales
    const salesResponse = await fetch(`${baseUrl}/api/sales?limit=10000`, {
      method: 'GET',
      headers: authHeaders,
    });
    if (salesResponse.ok) {
      const salesData = await salesResponse.json();
      for (const sale of salesData.sales || []) {
        await fetch(`${baseUrl}/api/sales/${sale.id}`, {
          method: 'DELETE',
          headers: authHeaders,
        });
      }
    }

    // Delete purchases
    const purchasesResponse = await fetch(
      `${baseUrl}/api/purchases?limit=10000`,
      {
        method: 'GET',
        headers: authHeaders,
      }
    );
    if (purchasesResponse.ok) {
      const purchasesData = await purchasesResponse.json();
      for (const purchase of purchasesData.purchases || []) {
        await fetch(`${baseUrl}/api/purchases/${purchase.id}`, {
          method: 'DELETE',
          headers: authHeaders,
        });
      }
    }

    // Delete payments
    const paymentsResponse = await fetch(
      `${baseUrl}/api/payments?limit=10000`,
      {
        method: 'GET',
        headers: authHeaders,
      }
    );
    if (paymentsResponse.ok) {
      const paymentsData = await paymentsResponse.json();
      for (const payment of paymentsData.payments || []) {
        await fetch(`${baseUrl}/api/payments/${payment.id}`, {
          method: 'DELETE',
          headers: authHeaders,
        });
      }
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting transactional data:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Không thể xóa dữ liệu giao dịch.',
    };
  }
}

export async function backupAllTransactionalData(): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    const authHeaders = await getAuthHeaders();
    const baseUrl = getBaseUrl();

    const [salesRes, purchasesRes, paymentsRes, customersRes, productsRes] =
      await Promise.all([
        fetch(`${baseUrl}/api/sales?limit=10000`, {
          method: 'GET',
          headers: authHeaders,
        }),
        fetch(`${baseUrl}/api/purchases?limit=10000`, {
          method: 'GET',
          headers: authHeaders,
        }),
        fetch(`${baseUrl}/api/payments?limit=10000`, {
          method: 'GET',
          headers: authHeaders,
        }),
        fetch(`${baseUrl}/api/customers?limit=10000`, {
          method: 'GET',
          headers: authHeaders,
        }),
        fetch(`${baseUrl}/api/products?limit=10000`, {
          method: 'GET',
          headers: authHeaders,
        }),
      ]);

    const salesData = salesRes.ok ? (await salesRes.json()).sales || [] : [];
    const purchasesData = purchasesRes.ok
      ? (await purchasesRes.json()).purchases || []
      : [];
    const paymentsData = paymentsRes.ok
      ? (await paymentsRes.json()).payments || []
      : [];
    const customersData = customersRes.ok
      ? (await customersRes.json()).customers || []
      : [];
    const productsData = productsRes.ok
      ? (await productsRes.json()).products || []
      : [];

    const wb = xlsx.utils.book_new();

    if (salesData.length > 0) {
      xlsx.utils.book_append_sheet(
        wb,
        xlsx.utils.json_to_sheet(salesData),
        'Sales'
      );
    }
    if (purchasesData.length > 0) {
      xlsx.utils.book_append_sheet(
        wb,
        xlsx.utils.json_to_sheet(purchasesData),
        'Purchases'
      );
    }
    if (paymentsData.length > 0) {
      xlsx.utils.book_append_sheet(
        wb,
        xlsx.utils.json_to_sheet(paymentsData),
        'Payments'
      );
    }
    if (customersData.length > 0) {
      xlsx.utils.book_append_sheet(
        wb,
        xlsx.utils.json_to_sheet(customersData),
        'Customers'
      );
    }
    if (productsData.length > 0) {
      xlsx.utils.book_append_sheet(
        wb,
        xlsx.utils.json_to_sheet(productsData),
        'Products'
      );
    }

    const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });

    return { success: true, data: buffer.toString('base64') };
  } catch (error: unknown) {
    console.error('Error backing up data:', error);
    return { success: false, error: 'Không thể tạo bản sao lưu.' };
  }
}
