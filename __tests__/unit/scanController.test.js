import { describe, test, expect, beforeEach, vi } from 'vitest';

vi.mock('../../services/scanService.js', () => ({
  scanDomain: vi.fn()
}));

vi.mock('../../db/db.js', () => ({
  insertResult: vi.fn()
}));

const { scanDomain } = await import('../../services/scanService.js');
const { insertResult } = await import('../../db/db.js');
const { handleScan } = await import('../../controllers/scanController.js');

describe('handleScan', () => {
  let req;
  let res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { body: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
  });

  test('returns 400 when domain is missing', async () => {
    await handleScan(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'domain is required' });
  });

  test('returns 400 when scanService throws INVALID_DOMAIN', async () => {
    req.body.domain = '   ';
    scanDomain.mockRejectedValue(new Error('INVALID_DOMAIN'));

    await handleScan(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'invalid domain' });
  });

  test('successful scan inserts into DB and returns result', async () => {
    req.body.domain = 'example.com';

    const mockResult = {
      domain: 'example.com',
      ip: '1.1.1.1',
      ssl: { valid: true },
      whois: { registrarName: 'Cloudflare' },
      timestamp: '2026-01-07T12:00:00Z'
    };

    scanDomain.mockResolvedValue(mockResult);
    insertResult.mockReturnValue(42);

    await handleScan(req, res);

    expect(insertResult).toHaveBeenCalledWith(mockResult);
    expect(res.json).toHaveBeenCalledWith({
      id: 42,
      result: mockResult
    });
  });

  test('returns 500 when scanService throws SCAN_FAILED', async () => {
    req.body.domain = 'example.com';
    scanDomain.mockRejectedValue(new Error('SCAN_FAILED'));

    await handleScan(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'scan failed' });
  });

  test('returns 500 when insertResult throws', async () => {
    req.body.domain = 'example.com';

    scanDomain.mockResolvedValue({
      domain: 'example.com',
      ip: '1.1.1.1',
      ssl: {},
      whois: {},
      timestamp: '2026-01-07T12:00:00Z'
    });

    insertResult.mockImplementation(() => {
      throw new Error('DB_FAIL');
    });

    await handleScan(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'failed to save result' });
  });
});
