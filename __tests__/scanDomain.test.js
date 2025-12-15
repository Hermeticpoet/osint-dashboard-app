// __tests__/scanDomain.test.js
import { jest } from '@jest/globals';

// Define mocks before importing
jest.unstable_mockModule('node:dns/promises', () => ({
  lookup: jest.fn(),
}));

jest.unstable_mockModule('ssl-checker', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('../services/whoisService.js', () => ({
  getWhoisData: jest.fn(),
}));

// Import the modules *after* mocks are set up
const { scanDomain } = await import('../services/scanDomain.js');
const dns = await import('node:dns/promises');
const { default: sslChecker } = await import('ssl-checker');
const whoisService = await import('../services/whoisService.js');

describe('scanDomain', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns full scan result for valid domain', async () => {
    dns.lookup.mockResolvedValue({ address: '1.2.3.4' });
    sslChecker.mockResolvedValue({ valid: true, daysRemaining: 90 });
    whoisService.getWhoisData.mockResolvedValue({
      registrarName: 'Test Registrar',
    });

    const result = await scanDomain('https://example.com');
    expect(result).toMatchObject({
      domain: 'example.com',
      ip: '1.2.3.4',
      ssl: { valid: true, daysRemaining: 90 },
      whois: { registrarName: 'Test Registrar' },
    });
  });

  test('throws error for missing domain input', async () => {
    await expect(scanDomain(null)).rejects.toThrow('Domain is required');
  });

  test('throws error for invalid domain format', async () => {
    await expect(scanDomain('not_a_domain')).rejects.toThrow(
      'Invalid domain format'
    );
  });

  test('throws error on DNS failure', async () => {
    dns.lookup.mockRejectedValue(new Error('DNS fail'));
    await expect(scanDomain('example.com')).rejects.toThrow(
      'DNS resolution failed: DNS fail'
    );
  });

  test('throws error on SSL failure', async () => {
    dns.lookup.mockResolvedValue({ address: '1.2.3.4' });
    sslChecker.mockRejectedValue(new Error('SSL fail'));
    await expect(scanDomain('example.com')).rejects.toThrow(
      'SSL check failed: SSL fail'
    );
  });

  test('returns result without WHOIS if WHOIS fails', async () => {
    dns.lookup.mockResolvedValue({ address: '1.2.3.4' });
    sslChecker.mockResolvedValue({ valid: true });
    whoisService.getWhoisData.mockRejectedValue(new Error('WHOIS fail'));

    const result = await scanDomain('example.com');
    expect(result).toMatchObject({
      domain: 'example.com',
      ip: '1.2.3.4',
      ssl: { valid: true },
    });
    expect(result.whois).toBeUndefined();
  });
});
