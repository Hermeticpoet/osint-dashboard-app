# SDLC Documentation – osint-dashboard

## 1. Feature Overview: `/scan` Route

- Accepts domain input
- Normalizes, validates, and performs SSL certificate scan
- Resolves DNS to IP address
- Performs WHOIS lookup for `.com` and `.net` domains via RDAP
- Returns combined result with optional `whois` field

## 2. Validation Logic

- `normalizeDomain()` strips protocols, paths, ports, credentials
- `isValidDomain()` uses regex for FQDN and TLD validation
- MVP uses regex; future plan to evaluate `tldts` or `punycode`

## 3. Security Considerations

- Input validation to prevent malformed/malicious domains
- Error handling with status codes and messages
- Future: DNS resolution, logging, audit trail
- DNS resolution added using `dns.promises.lookup()` to detect unreachable domains
- Returns 404 with clear error message if domain cannot be resolved
- IP address included in successful responses for traceability
- WHOIS failures are non-blocking and don’t expose sensitive errors

## 4. Testing

- Manual `curl` tests for:
  - Expired certs
  - Malformed URLs
  - Invalid FQDNs
  - Trailing dots
  - Punycode domains (regex passed, DNS failed)
  - WHOIS integration tested with `google.com` and `example.com`
  - WHOIS field included only for supported TLDs
  - Structured output confirmed via `jq`

## 5. Dependencies

- `ssl-checker` installed via `npm`
- No external domain parsing libraries yet

## 6. WHOIS Lookup Module

- **File:** `services/whoisService.js`
- **Function:** `getWhoisData(domain)`
- **Purpose:** Fetch WHOIS-like data for `.com` and `.net` domains using RDAP
- **Tech Stack:** Axios for HTTP requests, Verisign RDAP endpoints
- **Features:**
  - Domain normalization and validation
  - TLD detection with endpoint routing
  - Registrar name extraction from RDAP vCard
  - Creation and expiration date parsing from RDAP events
  - Error handling with environment-aware logging
- **Limitations:**
  - Only supports `.com` and `.net` domains
  - Returns `null` for unsupported TLDs or missing data

## 7. Next Steps
