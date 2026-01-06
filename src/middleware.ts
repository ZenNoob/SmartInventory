import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to handle subdomain routing for online stores
 * 
 * Examples:
 * - ygostore.smartinventory.com -> /store/ygostore
 * - ygostore.localhost:3000 -> /store/ygostore
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  
  // Extract subdomain from hostname
  // Handles: subdomain.smartinventory.com, subdomain.localhost:3000
  const subdomain = getSubdomain(hostname);
  
  // Create response with pathname header for layout detection
  const response = NextResponse.next();
  response.headers.set('x-pathname', url.pathname);
  
  // If there's a subdomain and we're not already on /store path
  if (subdomain && !url.pathname.startsWith('/store/') && !url.pathname.startsWith('/api/')) {
    // Skip for static files and Next.js internals
    if (
      url.pathname.startsWith('/_next') ||
      url.pathname.startsWith('/favicon') ||
      url.pathname.includes('.')
    ) {
      return response;
    }
    
    // Rewrite to /store/[subdomain] path
    url.pathname = `/store/${subdomain}${url.pathname}`;
    const rewriteResponse = NextResponse.rewrite(url);
    rewriteResponse.headers.set('x-pathname', `/store/${subdomain}${request.nextUrl.pathname}`);
    return rewriteResponse;
  }
  
  return response;
}

/**
 * Extract subdomain from hostname
 */
function getSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];
  
  // List of main domains (no subdomain extraction)
  const mainDomains = [
    'localhost',
    'smartinventory.com',
    'www.smartinventory.com',
  ];
  
  // If it's a main domain, no subdomain
  if (mainDomains.includes(host)) {
    return null;
  }
  
  // Check for subdomain pattern: subdomain.domain.com or subdomain.localhost
  const parts = host.split('.');
  
  // For localhost: subdomain.localhost
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0];
  }
  
  // For production: subdomain.smartinventory.com
  if (parts.length >= 3) {
    // Skip www
    if (parts[0] === 'www') {
      return null;
    }
    return parts[0];
  }
  
  return null;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
