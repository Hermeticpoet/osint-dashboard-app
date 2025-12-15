import { getWhoisData } from '../services/whoisService.js';

describe('getWhoisData', () => {
  test('returns WHOIS info for a valid .com domain', async () => {
    const result = await getWhoisData('google.com');
    expect(result).toBeDefined();
    expect(result).toHaveProperty('registrarName');
    expect(result).toHaveProperty('creationDate');
    expect(result).toHaveProperty('expirationDate');
  });

  test('returns null for unsupported TLD', async () => {
    const result = await getWhoisData('example.ie');
    expect(result).toBeNull();
  });

  test('returns null for invalid domain', async () => {
    const result = await getWhoisData('not_a_domain');
    expect(result).toBeNull();
  });
});
