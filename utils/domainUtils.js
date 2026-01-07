export const cleanDomains = (list = []) =>
  [
    ...new Set(
      list
        .map(s => (typeof s === 'string' ? s.trim() : ''))
        .filter(Boolean)
        .map(s => {
          try {
            return new URL(s.includes('://') ? s : 'http://' + s).hostname;
          } catch {
            return s;
          }
        })
        .map(d =>
          d
            .toLowerCase()
            .replace(/\.+/g, '.')
            .replace(/^\.+|\.+$/g, '')
        )
        .filter(
          d =>
            /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(d) &&
            d.includes('.') &&
            d.length > 2
        )
    ),
  ].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

// NEW: single-domain normalizer
export const normalizeDomain = input => {
  const cleaned = cleanDomains([input]);
  return cleaned.length > 0 ? cleaned[0] : '';
};

// NEW: domain validator (matches cleanDomains rules)
export const isValidDomain = input => {
  if (typeof input !== 'string') return false;

  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return false;

  // must contain a dot
  if (!trimmed.includes('.')) return false;

  // must match allowed characters and structure
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(trimmed)) return false;

  // must be longer than 2 chars
  if (trimmed.length <= 2) return false;

  // NEW: TLD must be at least 2 characters
  const parts = trimmed.split('.');
  const tld = parts[parts.length - 1];
  if (tld.length < 2) return false;

  return true;
};
