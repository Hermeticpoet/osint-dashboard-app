exports.handleScan = (req, res) => {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  res.json({ message: `Scan initiated for ${domain}` });
};
const sslChecker = require('ssl-checker');

function normalizeDomain(input) {
  if (!input || typeof input !== 'string') return '';
  let d = input.trim().toLowerCase();

  // Remove protocol
  d = d.replace(/^[a-z]+:\/\//, '');

  // Remove path/query/hash
  d = d.split('/')[0].split('?')[0].split('#')[0];

  // Remove credentials if present user:pass@
  if (d.includes('@')) d = d.split('@').pop();

  // Remove port if present :443
  d = d.split(':')[0];

  // Remove trailing dot
  if (d.endsWith('.')) d = d.slice(0, -1);

  return d;
}

function isValidDomain(domain) {
  // Basic FQDN validation: labels 1-63 chars, A-Z0-9- not starting/ending with hyphen, at least one dot, total <= 253
  if (!domain) return false;
  if (domain.length > 253) return false;

  const labels = domain.split('.');
  if (labels.length < 2) return false;

  const labelRe = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/i;
  for (const label of labels) {
    if (!labelRe.test(label)) return false;
  }

  // TLD should be alpha and >= 2
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,}$/i.test(tld)) return false;

  return true;
}

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

    const ssl = await sslChecker(domain, { method: 'GET', port: 443 });

    // Example fields: valid, daysRemaining, validFrom, validTo, validFor[]
    return res.json({
      domain,
      ssl,
    });
  } catch (err) {
    return res.status(502).json({
      error: 'SSL check failed',
      message: err?.message || 'Unknown error',
    });
  }
};