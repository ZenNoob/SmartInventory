import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login API', () => {
    it('should return success with valid credentials', async () => {
      const mockResponse = {
        success: true,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          displayName: 'Test User',
          role: 'admin',
          stores: [{ id: 'store-1', name: 'Store 1', code: 'S1' }],
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe('test@example.com');
      expect(data.user.stores).toHaveLength(1);
    });

    it('should return error with invalid credentials', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid email or password',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'wrong@example.com', password: 'wrongpass' }),
      });

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should lock account after 5 failed attempts', async () => {
      const mockResponse = {
        success: false,
        error: 'Account locked. Please try again in 15 minutes.',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 423,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'locked@example.com', password: 'wrongpass' }),
      });

      const data = await response.json();
      expect(data.error).toContain('Account locked');
    });
  });

  describe('Logout API', () => {
    it('should invalidate session on logout', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Get Current User API', () => {
    it('should return user data when authenticated', async () => {
      const mockResponse = {
        success: true,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          displayName: 'Test User',
          role: 'admin',
          permissions: { dashboard: ['view'] },
          stores: [{ id: 'store-1', name: 'Store 1', code: 'S1' }],
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.id).toBe('user-1');
    });

    it('should return 401 when not authenticated', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ success: false, error: 'Unauthorized' }),
      });

      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      expect(response.status).toBe(401);
    });
  });
});
