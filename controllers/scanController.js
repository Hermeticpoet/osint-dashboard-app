const sslChecker = require('ssl-checker');
const dns = require('dns').promises;

/**
 * Normalizes a potentially messy domain input to a clean FQDN.
 * Strips protocols, paths, credentials, ports, etc.
 * @param {string} input - Raw domain/URL string.
 * @returns {string} Cleaned lowercase domain or empty string if invalid input.
 */
function normalizeDomain(input) {
  if (!input || typeof input !== 'string') return '';
  let d = input.trim().toLowerCase();
  d = d.replace(/^[a-z]+:\/\//, ''); // remove protocol
  d = d.split('/')[0].split('?')[0].split('#')[0];
  if (d.includes('@')) d = d.split('@').pop(); // remove credentials
  d = d.split(':')[0]; // remove port
  if (d.endsWith('.')) d = d.slice(0, -1);
  return d;
}

/**
 * Validates whether a given domain is a syntactically valid FQDN.
 * @param {string} domain - Domain string to validate.
 * @returns {boolean} True if valid, false otherwise.
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
  if (!/^[a-z0-9-]{2,}$/i.test(tld)) return false;

  return true;
}

/**
 * Handles POST /scan requests.
 * Validates and normalizes domain, resolves DNS, checks SSL cert.
 * Returns domain, IP, and SSL info or appropriate error.
 */
exports.handleScan = async (req, res) => {
  try {
    const raw = req.body?.domain;
    if (!raw) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const domain = normalizeDomain(raw);
    if (!isValidDomain(domain)) {
      return res.status(400).json({ error: 'Invalid domain format', input: raw });
    }

    // DNS Lookup
    let ip;
    try {
      const lookupResult = await dns.lookup(domain);
      ip = lookupResult.address;
    } catch (dnsErr) {
      return res.status(404).json({
        error: 'DNS resolution failed',
        input: raw,
        domain,
        message: dnsErr.message || dnsErr.code || 'Unknown DNS error',
      });
    }

    // SSL Checker
    let ssl;
    try {
      ssl = await sslChecker(domain, { method: 'GET', port: 443 });
    } catch (sslErr) {
      return res.status(502).json({
        error: 'SSL check failed',
        domain,
        ip,
        message: sslErr.message || 'Unknown SSL error',
      });
    }

    return res.json({
      domain,
      ip,
      ssl,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Internal server error',
      message: err?.message || 'Unknown error',
    });
  }
};
