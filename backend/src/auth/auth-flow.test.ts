/**
 * Integration Tests for Authentication Flow
 * 
 * Tests the multi-tenant authentication flow including:
 * - JWT token generation and validation
 * - Role-based authentication
 * - Token structure validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/auth-service';
import { generateMultiTenantToken, validateMultiTenantToken, type MultiTenantJwtPayload } from './jwt';
import type { UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'smart-inventory-secret-key-change-in-production';

describe('Authentication Flow - JWT Token', () => {
  describe('Token Generation', () => {
    it('should generate valid JWT token with multi-tenant payload', () => {
      const payload = {
        userId: 'user-123',
        tenantUserId: 'tenant-user-456',
        tenantId: 'tenant-789',
        email: 'test@example.com',
        role: 'owner' as UserRole,
        stores: ['store-1', 'store-2'],
        sessionId: 'session-abc',
      };

      const token = generateMultiTenantToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include all required fields in token payload', () => {
      const payload = {
        userId: 'user-123',
        tenantUserId: 'tenant-user-456',
        tenantId: 'tenant-789',
        email: 'test@example.com',
        role: 'store_manager' as UserRole,
        stores: ['store-1'],
        sessionId: 'session-abc',
      };

      const token = generateMultiTenantToken(payload);
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded.sub).toBe('user-123');
      expect(decoded.tenant_id).toBe('tenant-789');
      expect(decoded.tenant_user_id).toBe('tenant-user-456');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('store_manager');
      expect(decoded.stores).toEqual(['store-1']);
      expect(decoded.session_id).toBe('session-abc');
    });

    it('should set expiration time on token', () => {
      const payload = {
        userId: 'user-123',
        tenantUserId: 'tenant-user-456',
        tenantId: 'tenant-789',
        email: 'test@example.com',
        role: 'salesperson' as UserRole,
        stores: [],
        sessionId: 'session-abc',
      };

      const token = generateMultiTenantToken(payload);
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat as number);
    });
  });

  describe('Token Verification', () => {
    it('should verify valid token and return payload', () => {
      const payload = {
        userId: 'user-123',
        tenantUserId: 'tenant-user-456',
        tenantId: 'tenant-789',
        email: 'test@example.com',
        role: 'company_manager' as UserRole,
        stores: ['store-1', 'store-2'],
        sessionId: 'session-abc',
      };

      const token = generateMultiTenantToken(payload);
      const verified = validateMultiTenantToken(token);

      expect(verified).not.toBeNull();
      expect(verified?.sub).toBe('user-123');
      expect(verified?.tenant_id).toBe('tenant-789');
      expect(verified?.role).toBe('company_manager');
    });

    it('should return null for invalid token', () => {
      const result = validateMultiTenantToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for tampered token', () => {
      const payload = {
        userId: 'user-123',
        tenantUserId: 'tenant-user-456',
        tenantId: 'tenant-789',
        email: 'test@example.com',
        role: 'owner' as UserRole,
        stores: [],
        sessionId: 'session-abc',
      };

      const token = generateMultiTenantToken(payload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      
      const result = validateMultiTenantToken(tamperedToken);
      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create a token that's already expired
      const expiredToken = jwt.sign(
        {
          sub: 'user-123',
          tenant_id: 'tenant-789',
          email: 'test@example.com',
          role: 'owner',
          stores: [],
          session_id: 'session-abc',
        },
        JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const result = validateMultiTenantToken(expiredToken);
      expect(result).toBeNull();
    });
  });
});

describe('AuthService - Token Validation', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('validateToken', () => {
    it('should validate and decode valid token', () => {
      const payload = {
        userId: 'user-123',
        tenantUserId: 'tenant-user-456',
        tenantId: 'tenant-789',
        email: 'test@example.com',
        role: 'owner' as UserRole,
        stores: ['store-1'],
        sessionId: 'session-abc',
      };

      const token = generateMultiTenantToken(payload);
      const decoded = authService.validateToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe('user-123');
      expect(decoded?.tenant_id).toBe('tenant-789');
    });

    it('should return null for invalid token', () => {
      const result = authService.validateToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should handle both old and new token formats', () => {
      // Old format token (for backward compatibility)
      const oldFormatToken = jwt.sign(
        {
          userId: 'user-123',
          tenantId: 'tenant-789',
          tenantUserId: 'tenant-user-456',
          email: 'test@example.com',
          role: 'owner',
          stores: [],
          sessionId: 'session-abc',
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      const decoded = authService.validateToken(oldFormatToken);
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe('user-123');
      expect(decoded?.tenant_id).toBe('tenant-789');
    });
  });
});

describe('Authentication Flow - Role Validation', () => {
  const validRoles: UserRole[] = ['owner', 'company_manager', 'store_manager', 'salesperson'];

  it('should accept all valid roles in token', () => {
    for (const role of validRoles) {
      const payload = {
        userId: 'user-123',
        tenantUserId: 'tenant-user-456',
        tenantId: 'tenant-789',
        email: 'test@example.com',
        role,
        stores: [],
        sessionId: 'session-abc',
      };

      const token = generateMultiTenantToken(payload);
      const decoded = validateMultiTenantToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.role).toBe(role);
    }
  });
});

describe('Authentication Flow - Store Access', () => {
  it('should include store IDs in token for store-specific access', () => {
    const stores = ['store-1', 'store-2', 'store-3'];
    const payload = {
      userId: 'user-123',
      tenantUserId: 'tenant-user-456',
      tenantId: 'tenant-789',
      email: 'test@example.com',
      role: 'store_manager' as UserRole,
      stores,
      sessionId: 'session-abc',
    };

    const token = generateMultiTenantToken(payload);
    const decoded = validateMultiTenantToken(token);

    expect(decoded?.stores).toEqual(stores);
    expect(decoded?.stores).toHaveLength(3);
  });

  it('should handle empty stores array for users without store assignments', () => {
    const payload = {
      userId: 'user-123',
      tenantUserId: 'tenant-user-456',
      tenantId: 'tenant-789',
      email: 'test@example.com',
      role: 'owner' as UserRole,
      stores: [],
      sessionId: 'session-abc',
    };

    const token = generateMultiTenantToken(payload);
    const decoded = validateMultiTenantToken(token);

    expect(decoded?.stores).toEqual([]);
  });
});
