const {
  normalizeDomain,
  isValidDomain,
} = require('../controllers/scanController');

describe('normalizeDomain', () => {
  test('removes protocol and path', () => {
    expect(normalizeDomain('https://www.example.com/path')).toBe(
      'www.example.com'
    );
  });

  test('removes credentials and port', () => {
    expect(normalizeDomain('user:pass@example.com:8080')).toBe('example.com');
  });

  test('handles trailing dot', () => {
    expect(normalizeDomain('example.com.')).toBe('example.com');
  });

  test('returns empty string for invalid input', () => {
    expect(normalizeDomain(null)).toBe('');
    expect(normalizeDomain(123)).toBe('');
  });
});

describe('isValidDomain', () => {
  test('validates a proper domain', () => {
    expect(isValidDomain('example.com')).toBe(true);
  });

  test('rejects domain with invalid characters', () => {
    expect(isValidDomain('exa$mple.com')).toBe(false);
  });

  test('rejects domain with leading dash', () => {
    expect(isValidDomain('-example.com')).toBe(false);
  });

  test('rejects domain with short TLD', () => {
    expect(isValidDomain('example.c')).toBe(false);
  });

  test('rejects domain with no TLD', () => {
    expect(isValidDomain('localhost')).toBe(false);
  });
});
