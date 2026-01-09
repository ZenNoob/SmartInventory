import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Get session ID from cookie
    const sessionId = request.cookies.get('cart_session_id')?.value;
    
    const response = await fetch(`${API_URL}/storefront/${slug}/cart`, {
      headers: {
        'Content-Type': 'application/json',
        ...(sessionId && { 'X-Session-Id': sessionId }),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      // Return empty cart if not found
      if (response.status === 404) {
        return NextResponse.json({
          cart: {
            id: '',
            items: [],
            subtotal: 0,
            discountAmount: 0,
            shippingFee: 0,
            total: 0,
            itemCount: 0,
          }
        });
      }
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch cart' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Storefront cart API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    
    // Get or create session ID
    let sessionId = request.cookies.get('cart_session_id')?.value;
    const isNewSession = !sessionId;
    
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }
    
    const response = await fetch(`${API_URL}/storefront/${slug}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Failed to add item to cart' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Create response with session cookie if new
    const res = NextResponse.json(data);
    
    if (isNewSession) {
      res.cookies.set('cart_session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
    }
    
    return res;
  } catch (error) {
    console.error('Storefront cart POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
