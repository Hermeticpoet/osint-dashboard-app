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
