const { scanDomain } = require('../services/scanDomain');
const dns = require('dns').promises;
const sslChecker = require('ssl-checker');
const whoisService = require('../services/whoisService');

jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

jest.mock('ssl-checker', () => jest.fn());

jest.mock('../services/whoisService', () => ({
  getWhoisData: jest.fn(),
}));

describe('scanDomain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
