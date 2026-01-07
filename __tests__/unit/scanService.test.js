import { describe, test, expect, beforeEach, vi } from 'vitest';

vi.mock('whois-json', () => ({
  default: vi.fn()
}));

vi.mock('ssl-checker', () => ({
  default: vi.fn()
}));

// Mock fetch globally
global.fetch = vi.fn();

const whois = (await import('whois-json')).default;
const sslChecker = (await import('ssl-checker')).default;

const { scanDomain } = await import('../../services/scanService.js');

describe('scanDomain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------
  // DOMAIN NORMALIZATION
  // -----------------------------
  test('normalizes domain by stripping protocol and lowercasing', async () => {
    whois.mockResolvedValue({});
    sslChecker.mockResolvedValue({});
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ query: '93.184.216.34' })
    });

    const result = await scanDomain('  HTTPS://Example.COM/path  ');

    expect(result.domain).toBe('example.com');
  });

  // -----------------------------
  // FULL SUCCESSFUL SCAN
  // -----------------------------
  test('returns normalized scan result when all lookups succeed', async () => {
    whois.mockResolvedValue({
      registrar: 'Cloudflare',
      creationDate: '2020-01-01T00:00:00Z',
      expirationDate: '2026-01-01T00:00:00Z'
    });

    sslChecker.mockResolvedValue({
      valid: true,
      validFrom: '2024-01-01',
      validTo: '2025-01-01',
      daysRemaining: 300
    });

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ query: '93.184.216.34' })
    });

    const result = await scanDomain('example.com');

    expect(result).toEqual(
      expect.objectContaining({
        domain: 'example.com',
        ip: '93.184.216.34',
        ssl: {
          valid: true,
          validFrom: '2024-01-01',
          validTo: '2025-01-01',
          daysRemaining: 300
        },
        whois: {
          registrarName: 'Cloudflare',
          creationDate: '2020-01-01T00:00:00Z',
          expirationDate: '2026-01-01T00:00:00Z'
        }
      })
    );

    expect(typeof result.timestamp).toBe('string');
  });

  // -----------------------------
  // WHOIS FAILURE FALLBACK
  // -----------------------------
  test('handles WHOIS failure gracefully', async () => {
    whois.mockRejectedValue(new Error('WHOIS failed'));

    sslChecker.mockResolvedValue({
      valid: true,
      validFrom: '2024-01-01',
      validTo: '2025-01-01',
      daysRemaining: 300
    });

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ query: '93.184.216.34' })
    });

    const result = await scanDomain('example.com');

    expect(result.whois).toEqual({
      registrarName: null,
      creationDate: null,
      expirationDate: null
    });
  });

  // -----------------------------
  // SSL FAILURE FALLBACK
  // -----------------------------
  test('handles SSL failure gracefully', async () => {
    whois.mockResolvedValue({
      registrar: 'Cloudflare',
      creationDate: '2020-01-01T00:00:00Z',
      expirationDate: '2026-01-01T00:00:00Z'
    });

    sslChecker.mockRejectedValue(new Error('SSL failed'));

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ query: '93.184.216.34' })
    });

    const result = await scanDomain('example.com');

    expect(result.ssl).toEqual({
      valid: null,
      validFrom: null,
      validTo: null,
      daysRemaining: null
    });
  });

  // -----------------------------
  // IP FAILURE FALLBACK
  // -----------------------------
  test('handles IP lookup failure gracefully', async () => {
    whois.mockResolvedValue({});
    sslChecker.mockResolvedValue({});

    fetch.mockResolvedValue({
      ok: false
    });

    const result = await scanDomain('example.com');

    expect(result.ip).toBe(null);
  });

  // -----------------------------
  // TOTAL FAILURE
  // -----------------------------
  test('throws SCAN_FAILED when all lookups fail', async () => {
    whois.mockRejectedValue(new Error('WHOIS failed'));
    sslChecker.mockRejectedValue(new Error('SSL failed'));
    fetch.mockRejectedValue(new Error('IP failed'));

    await expect(scanDomain('example.com')).rejects.toThrow('SCAN_FAILED');
  });
});
