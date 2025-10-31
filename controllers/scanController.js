const { scanDomain } = require('../services/scanDomain');

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
 * Delegates to scanDomain() and returns result or error.
 */
async function handleScan(req, res) {
  try {
    const raw = req.body?.domain;
    const result = await scanDomain(raw);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({
      error: err.message || 'Scan failed',
    });
  }
}

module.exports = {
  handleScan,
  normalizeDomain,
  isValidDomain,
};


