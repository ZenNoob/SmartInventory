import { Request } from 'express';
import jwt from 'jsonwebtoken';

const CUSTOMER_AUTH_COOKIE = 'customer_token';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
export async function authenticateCustomer(request: Request): Promise<CustomerAuthResult> {
  // Get token from cookie or Authorization header
  const token = request.cookies?.[CUSTOMER_AUTH_COOKIE] || 
    request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return {
      success: false,
      error: 'Vui lòng đăng nhập để tiếp tục',
      status: 401,
    };
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    
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
