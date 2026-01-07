// services/scanService.js
import whois from 'whois-json';
import sslChecker from 'ssl-checker';
import { normalizeDomain } from '../utils/domainUtils.js';

/**
 * Normalize domain input by stripping protocol, lowercasing, and trimming.
 * @param {string} domain - Raw domain input
 * @returns {string} Normalized domain
 */

/**
 * Performs a comprehensive domain scan including WHOIS, SSL, and IP lookups.
 * Handles partial failures gracefully, but throws if all lookups fail.
 * @param {string} domain - Domain to scan
 * @returns {Promise<Object>} Scan result with domain, ip, ssl, whois, and timestamp
 * @throws {Error} SCAN_FAILED if all lookups fail
 */
export async function scanDomain(domain) {
  const normalizedDomain = normalizeDomain(domain);

  // Track success/failure of each lookup
  let whoisSuccess = false;
  let sslSuccess = false;
  let ipSuccess = false;

  // WHOIS lookup
  let whoisData = {
    registrarName: null,
    creationDate: null,
    expirationDate: null,
  };
  try {
    const whoisResult = await whois(normalizedDomain);
    if (whoisResult) {
      whoisData = {
        registrarName: whoisResult.registrar || null,
        creationDate: whoisResult.creationDate || null,
        expirationDate: whoisResult.expirationDate || null,
      };
      whoisSuccess = true;
    }
  } catch (err) {
    // WHOIS failure is handled gracefully - keep null values
  }

  // SSL lookup
  let sslData = {
    valid: null,
    validFrom: null,
    validTo: null,
    daysRemaining: null,
  };
  try {
    const sslResult = await sslChecker(normalizedDomain);
    if (sslResult) {
      sslData = {
        valid: sslResult.valid ?? null,
        validFrom: sslResult.validFrom ?? null,
        validTo: sslResult.validTo ?? null,
        daysRemaining: sslResult.daysRemaining ?? null,
      };
      sslSuccess = true;
    }
  } catch (err) {
    // SSL failure is handled gracefully - keep null values
  }

  // IP lookup via ip-api.com
  let ip = null;
  try {
    const response = await fetch(`http://ip-api.com/json/${normalizedDomain}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.query) {
        ip = data.query;
        ipSuccess = true;
      }
    }
  } catch (err) {
    // IP failure is handled gracefully - keep null
  }

  // Total failure check: if all three lookups failed, throw
  if (!whoisSuccess && !sslSuccess && !ipSuccess) {
    throw new Error('SCAN_FAILED');
  }

  return {
    domain: normalizedDomain,
    ip,
    ssl: sslData,
    whois: whoisData,
    timestamp: new Date().toISOString(),
  };
}
