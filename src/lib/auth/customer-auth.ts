import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const CUSTOMER_AUTH_COOKIE = 'customer_token';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export interface CustomerAuthPayload {
  customerId: string;
  onlineStoreId: string;
  email: string;
}

export interface CustomerAuthResult {
  success: boolean;
  customer?: CustomerAuthPayload;
  error?: string;
  status?: number;
}

/**
 * Authenticate customer request from storefront
 */
export async function authenticateCustomer(request: NextRequest): Promise<CustomerAuthResult> {
  // Get token from cookie
  const token = request.cookies.get(CUSTOMER_AUTH_COOKIE)?.value;

  if (!token) {
    return {
      success: false,
      error: 'Vui lòng đăng nhập để tiếp tục',
      status: 401,
    };
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    return {
      success: true,
      customer: {
        customerId: payload.customerId as string,
        onlineStoreId: payload.onlineStoreId as string,
        email: payload.email as string,
      },
    };
  } catch {
    return {
      success: false,
      error: 'Phiên đăng nhập đã hết hạn',
      status: 401,
    };
  }
}
