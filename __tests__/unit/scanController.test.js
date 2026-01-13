// __tests__/unit/scanController.test.js
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// ESM-compatible mocks
await jest.unstable_mockModule('../../services/scanService.js', () => ({
  __esModule: true,
  scanDomain: jest.fn(),
}));

await jest.unstable_mockModule('../../db/db.js', () => ({
  __esModule: true,
  insertResult: jest.fn(),
}));

// Import AFTER mocks are registered
const { scanDomain } = await import('../../services/scanService.js');
const { insertResult } = await import('../../db/db.js');
const { handleScan } = await import('../../controllers/scanController.js');

describe('handleScan', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('domain validation', () => {
    test('returns 400 with INVALID_DOMAIN when domain is missing', async () => {
      await handleScan(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        id: null,
        result: 'INVALID_DOMAIN',
      });
      expect(scanDomain).not.toHaveBeenCalled();
    });

    test('returns 400 with INVALID_DOMAIN when domain is empty string', async () => {
      req.body.domain = '';

      await handleScan(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        id: null,
        result: 'INVALID_DOMAIN',
      });
      expect(scanDomain).not.toHaveBeenCalled();
    });

    test('returns 400 with INVALID_DOMAIN when domain is only whitespace', async () => {
      req.body.domain = '   ';

      await handleScan(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        id: null,
        result: 'INVALID_DOMAIN',
      });
      expect(scanDomain).not.toHaveBeenCalled();
    });

    test('returns 400 with INVALID_DOMAIN when domain has invalid characters', async () => {
      req.body.domain = 'exa$mple.com';

      await handleScan(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        id: null,
        result: 'INVALID_DOMAIN',
      });
      expect(scanDomain).not.toHaveBeenCalled();
    });

    test('returns 400 with INVALID_DOMAIN when domain has no TLD', async () => {
      req.body.domain = 'localhost';

      await handleScan(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        id: null,
        result: 'INVALID_DOMAIN',
      });
      expect(scanDomain).not.toHaveBeenCalled();
    });

    test('returns 400 with INVALID_DOMAIN when domain has short TLD', async () => {
      req.body.domain = 'example.c';

      await handleScan(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        id: null,
        result: 'INVALID_DOMAIN',
      });
      expect(scanDomain).not.toHaveBeenCalled();
    });

    test('returns 400 with INVALID_DOMAIN when domain has leading dash', async () => {
      req.body.domain = '-example.com';

      await handleScan(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        id: null,
        result: 'INVALID_DOMAIN',
      });
      expect(scanDomain).not.toHaveBeenCalled();
    });

    test('normalizes domain before validation', async () => {
      req.body.domain = '  HTTPS://Example.COM/path  ';

      const mockResult = {
        domain: 'example.com',
        ip: '1.1.1.1',
        ssl: { valid: true },
        whois: { registrarName: 'Cloudflare' },
        timestamp: '2026-01-07T12:00:00Z',
      };

      scanDomain.mockResolvedValue(mockResult);
      insertResult.mockReturnValue(42);

      await handleScan(req, res);

      expect(scanDomain).toHaveBeenCalledWith('  HTTPS://Example.COM/path  ');
      expect(res.json).toHaveBeenCalledWith({
        id: 42,
        result: mockResult,
      });
    });
  });

  describe('scanDomain error handling', () => {
    test('returns 400 with INVALID_DOMAIN when scanDomain throws INVALID_DOMAIN', async () => {
      req.body.domain = 'example.com';
      scanDomain.mockRejectedValue(new Error('INVALID_DOMAIN'));

      await handleScan(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        id: null,
        result: 'INVALID_DOMAIN',
      });
    });

    test('returns 500 with SCAN_FAILED when scanDomain throws SCAN_FAILED', async () => {
      req.body.domain = 'example.com';
      scanDomain.mockRejectedValue(new Error('SCAN_FAILED'));

      await handleScan(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        id: null,
        result: 'SCAN_FAILED',
      });
    });
  });

  describe('successful scan', () => {
    test('successful scan inserts into DB and returns result', async () => {
      req.body.domain = 'example.com';

      const mockResult = {
        domain: 'example.com',
        ip: '1.1.1.1',
        ssl: { valid: true },
        whois: { registrarName: 'Cloudflare' },
        timestamp: '2026-01-07T12:00:00Z',
      };

      scanDomain.mockResolvedValue(mockResult);
      insertResult.mockReturnValue(42);

      await handleScan(req, res);

      expect(scanDomain).toHaveBeenCalledWith('example.com');
      expect(insertResult).toHaveBeenCalledWith(mockResult);
      expect(res.json).toHaveBeenCalledWith({
        id: 42,
        result: mockResult,
      });
    });

    test('returns 500 when insertResult throws', async () => {
      req.body.domain = 'example.com';

      scanDomain.mockResolvedValue({
        domain: 'example.com',
        ip: '1.1.1.1',
        ssl: {},
        whois: {},
        timestamp: '2026-01-07T12:00:00Z',
      });

      insertResult.mockImplementation(() => {
        throw new Error('DB_FAIL');
      });

      await handleScan(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'failed to save result',
      });
    });
  });
});
