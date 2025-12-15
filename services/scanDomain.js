import sslChecker from 'ssl-checker';
import * as dns from 'node:dns/promises';
import { getWhoisData } from './whoisService.js';
import {
  normalizeDomain,
  isValidDomain,
} from '../controllers/scanController.js';

async function scanDomain(rawInput) {
  const domain = rawInput?.trim().toLowerCase();
  if (!domain) throw new Error('Domain is required');

  const cleanDomain = normalizeDomain(domain);
  if (!isValidDomain(cleanDomain)) throw new Error('Invalid domain format');

  let whoisInfo = null;
  try {
    whoisInfo = await getWhoisData(cleanDomain);
  } catch (_) {
    whoisInfo = null;
  }

  let ip;
  try {
    const lookupResult = await dns.lookup(cleanDomain);
    ip = lookupResult.address;
  } catch (err) {
    throw new Error(`DNS resolution failed: ${err.message || err.code}`);
  }

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

export { scanDomain };
