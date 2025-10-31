const sslChecker = require('ssl-checker');
const dns = require('dns').promises;
const { getWhoisData } = require('./whoisService');

async function scanDomain(rawInput) {
  const domain = rawInput?.trim().toLowerCase();
  if (!domain) throw new Error('Domain is required');

  // Normalize and validate
  const { normalizeDomain, isValidDomain } = require('../controllers/scanController');
  const cleanDomain = normalizeDomain(domain);
  if (!isValidDomain(cleanDomain)) throw new Error('Invalid domain format');

  // WHOIS
  let whoisInfo = null;
  try {
    whoisInfo = await getWhoisData(cleanDomain);
  } catch (_) {
    whoisInfo = null;
  }

  // DNS
  let ip;
  try {
    const lookupResult = await dns.lookup(cleanDomain);
    ip = lookupResult.address;
  } catch (err) {
    throw new Error(`DNS resolution failed: ${err.message || err.code}`);
  }

  // SSL
  let ssl;
  try {
    ssl = await sslChecker(cleanDomain, { method: 'GET', port: 443 });
  } catch (err) {
    throw new Error(`SSL check failed: ${err.message}`);
  }

  const result = { domain: cleanDomain, ip, ssl };
  if (whoisInfo) result.whois = whoisInfo;
  return result;
}

module.exports = { scanDomain };
