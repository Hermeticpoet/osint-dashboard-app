const sslChecker = require('ssl-checker');

/**
 * Normalizes a potentially messy domain input to a clean FQDN.
 * Strips protocols, paths, credentials, ports, etc.
 * @param {string} input - Raw domain/URL string.
 * @returns {string} Cleaned lowercase domain or empty string if invalid input.
 */
function normalizeDomain(input) {
  if (!input || typeof input !== 'string') return '';
  
  let domain = input.trim().toLowerCase()
    .replace(/^[a-z]+:\/\//, '')  // Remove protocol
    .split(/[\/\?#]/)[0]          // Remove path/query/hash in one go
    .split('@').pop() || '';      // Remove credentials (user:pass@), fallback to empty if no @
    domain = domain.split(':')[0] // Remove port
                   .replace(/\.$/, ''); // Remove trailing dot

  return domain;
}

/**
 * Validates a domain as a basic FQDN.
 * Checks length, labels, and TLD per DNS rules.
 * @param {string} domain - Cleaned domain to validate.
 * @returns {boolean} True if valid.
 */
function isValidDomain(domain) {
  if (!domain || domain.length > 253) return false;

  const labels = domain.split('.');
  if (labels.length < 2) return false;

  const labelRe = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/i;
  for (const label of labels) {
    if (!labelRe.test(label)) return false;
  }

  const tld = labels[labels.length - 1];
  return /^[a-z]{2,}$/i.test(tld);
}

/**
 * Express.js handler: Initiates an SSL certificate scan for a given domain.
 * Validates input, normalizes, checks cert, and responds with results.
 */
exports.handleScan = async (req, res) => {
  try {
    const rawInput = req.body?.domain;
    if (!rawInput) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const domain = normalizeDomain(rawInput);
    if (!isValidDomain(domain)) {
      return res.status(400).json({ error: 'Invalid domain format', input: rawInput });
    }

    const sslInfo = await sslChecker(domain, { method: 'GET', port: 443 });

    return res.json({
      domain,
      ssl: sslInfo,  // Includes valid, daysRemaining, validFrom, validTo, validFor[]
    });
  } catch (err) {
    return res.status(502).json({
      error: 'SSL check failed',
      message: err?.message || 'Unknown error',
    });
  }
};