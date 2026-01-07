// __tests__/unit/protectedRoutes.test.js
import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const TEST_SECRET = process.env.JWT_SECRET || 'test-secret';

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = TEST_SECRET;
}

// Mock scanDomain from services/scanDomain.js (your real file)
const mockScanDomain = jest.fn(async domain => ({
  domain,
  ip: '127.0.0.1',
  ssl: null,
  whois: null,
}));

await jest.unstable_mockModule('../../services/scanDomain.js', () => ({
  __esModule: true,
  scanDomain: mockScanDomain,
}));

// Import app AFTER mocks are registered
const { app } = await import('../../server.js');

function signToken(role, overrides = {}) {
  const payload = {
    username: overrides.username || `${role}-user`,
    role,
    ...overrides,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
}

function signInvalidToken(role, overrides = {}) {
  const payload = {
    username: overrides.username || `${role}-user`,
    role,
    ...overrides,
  };

  return jwt.sign(payload, 'wrong-secret', {
    expiresIn: '1h',
  });
}

describe('Protected routes integration', () => {
  beforeAll(() => {
    mockScanDomain.mockClear();
  });

  describe('POST /scan (admin-only)', () => {
    test('returns 401 when token is missing', async () => {
      const res = await request(app)
        .post('/scan')
        .send({ domain: 'example.com' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Token required' });
    });

    test('returns 403 when token is invalid', async () => {
      const token = signInvalidToken('admin');

      const res = await request(app)
        .post('/scan')
        .set('Authorization', `Bearer ${token}`)
        .send({ domain: 'example.com' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Invalid or expired token' });
    });

    test('returns 403 Forbidden when token has wrong role (read-only)', async () => {
      const token = signToken('read-only');

      const res = await request(app)
        .post('/scan')
        .set('Authorization', `Bearer ${token}`)
        .send({ domain: 'example.com' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Forbidden' });
    });

    test('returns 200 and JSON body when token has admin role', async () => {
      const token = signToken('admin');

      const res = await request(app)
        .post('/scan')
        .set('Authorization', `Bearer ${token}`)
        .send({ domain: 'example.com' });

      expect(res.status).toBe(200);
      expect(typeof res.body).toBe('object');
      expect(res.body).not.toBeNull();

      // FIXED: match real controller output shape
      expect(res.body).toHaveProperty('result');
      expect(res.body.result).toHaveProperty('domain');
      expect(res.body.result.domain).toBe('example.com');
    });
  });

  describe('GET /results (admin and read-only)', () => {
    test('returns 401 when token is missing', async () => {
      const res = await request(app).get('/results');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Token required' });
    });

    test('returns 200 when token has read-only role', async () => {
      const token = signToken('read-only');

      const res = await request(app)
        .get('/results')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('returns 200 when token has admin role', async () => {
      const token = signToken('admin');

      const res = await request(app)
        .get('/results')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
