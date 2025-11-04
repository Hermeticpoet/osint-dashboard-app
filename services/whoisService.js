import axios from 'axios';

/**
 * Normalize arbitrary input into a bare domain string.
 * - Removes protocol, credentials, path/query/hash, port, and trailing dot.
 * @param {string} input - Raw domain or URL-like string.
 * @returns {string} Normalized domain (lowercased) or empty string if invalid input type.
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
 * Validate domain format with basic FQDN checks (RFC-style constraints).
 * - Labels 1-63 chars, alnum/hyphen, not starting/ending with hyphen.
 * - At least one dot; total length <= 253; alpha TLD (>=2).
 * @param {string} domain
 * @returns {boolean} True if format is acceptable, else false.
 */
function isValidDomain(domain) {
  if (!domain) return false;
  if (domain.length > 253) return false;
  const labels = domain.split('.');
  if (labels.length < 2) return false;
  const labelRe = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/i;
  for (const label of labels) {
    if (!labelRe.test(label)) return false;
  }
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,}$/i.test(tld)) return false;
  return true;
}

/**
 * Extract the registrar's display name from RDAP entities.
 * - Assumes RDAP vCard format: ["vcard", [[name, params, type, value], ...]].
 * @param {any[]} entities - RDAP entities array.
 * @returns {string|null} Registrar name if found; otherwise null.
 */
function extractRegistrarName(entities) {
  if (!Array.isArray(entities)) return null;
  const registrar = entities.find(
    e => Array.isArray(e.roles) && e.roles.includes('registrar')
  );
  if (!registrar || !Array.isArray(registrar.vcardArray)) return null;

  const [, vItems] = registrar.vcardArray;
  if (!Array.isArray(vItems)) return null;

  const fnItem = vItems.find(
    item => Array.isArray(item) && item[0] === 'fn' && item.length >= 4
  );
  if (fnItem && typeof fnItem[3] === 'string' && fnItem[3].trim())
    return fnItem[3].trim();

  const orgItem = vItems.find(
    item => Array.isArray(item) && item[0] === 'org' && item.length >= 4
  );
  if (orgItem && typeof orgItem[3] === 'string' && orgItem[3].trim())
    return orgItem[3].trim();

  return null;
}

/**
 * Extract an event timestamp from RDAP events by action names.
 * @param {any[]} events - RDAP events array.
 * @param {string[]} actionNames - Preferred action names, in priority order.
 * @returns {string|null} ISO timestamp if found; otherwise null.
 */
function extractEventDate(events, actionNames) {
  if (!Array.isArray(events)) return null;
  const target = events.find(ev => actionNames.includes(ev?.eventAction));
  return target?.eventDate || null;
}

/**
 * Fetch WHOIS-like data via RDAP for .com and .net domains.
 * @param {string} domain
 * @returns {Promise<{registrarName: string, creationDate: string, expirationDate: string} | null>}
 */
async function getWhoisData(domain) {
  try {
    const normalized = normalizeDomain(domain);
    if (!isValidDomain(normalized)) return null;

    const tld = normalized.split('.').pop().toLowerCase();
    const endpointMap = {
      com: 'https://rdap.verisign.com/com/v1/domain/',
      net: 'https://rdap.verisign.com/net/v1/domain/',
    };
    const base = endpointMap[tld];
    if (!base) return null;

    const url = `${base}${encodeURIComponent(normalized)}`;
    const resp = await axios.get(url, {
      timeout: 10000,
      validateStatus: status => status >= 200 && status < 300,
    });

    const data = resp?.data;
    if (!data || typeof data !== 'object') return null;

    const registrarName = extractRegistrarName(data.entities);
    const creationDate = extractEventDate(data.events, [
      'registration',
      'creation',
      'registered',
    ]);
    const expirationDate = extractEventDate(data.events, [
      'expiration',
      'expire',
      'expiry',
    ]);

    if (!registrarName || !creationDate || !expirationDate) {
      return null;
    }

    return { registrarName, creationDate, expirationDate };
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('getWhoisData error:', e?.message || e);
    }
    return null;
  }
}

export { getWhoisData };
