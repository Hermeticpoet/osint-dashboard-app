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

## 7. Refactor and Full Test Coverage of Domain Scan Pipeline

- Extracted orchestration logic from `handleScan()` into a dedicated service module: `services/scanDomain.js`
- Centralized exports in `scanController.js` using `module.exports = { ... }` for maintainability and clarity
- Replaced anonymous export with named `async function handleScan()` for better stack traces and testability
- Added unit tests for:
  - `normalizeDomain()` and `isValidDomain()` in `domainUtils.test.js`
  - `getWhoisData()` in `whoisService.test.js`
  - `scanDomain()` in `scanDomain.test.js` using full mock coverage for DNS, SSL, and WHOIS
- Confirmed 100% pass rate across 18 tests in 3 suites
- System now locked down and ready for expansion into CLI tools, batch scanning, or dashboard integration

## 8. CLI Tool Refactor and Batch Scanning Support

- Refactored CLI tool using `commander` for robust argument parsing and help output
- Added support for:
  - `--input <file>`: batch scan domains from a file
  - `--output <file>`: save results to JSON or CSV
  - `--format <type>`: choose between `json` or `csv` output
- Skips invalid domains with warning
- Adds `timestamp` to each scan result for traceability
- Uses `ensureDir()` to create output folders if missing
- CLI now supports single scans, batch scans, and file output — ready for automation and CI pipelines

## 9. CLI Tool: Concurrency and Verbose Enhancements

- Integrated `p-limit` for controlled parallel scanning
- Added `--verbose` flag for real-time progress and diagnostics
- Enhanced domain validation to support subdomains and IPs
- Improved CSV output with proper escaping
- Modularized CLI exports for reuse in other scripts or tests
- CLI now supports efficient, scalable scans with full user control

## 10. Global CLI Setup (Internal Only)

- CLI tool is now installable globally via `npm install -g .` for internal use
- Added `bin` entry to `package.json` to expose CLI as `osint-scan`
- Enables usage from any directory, ideal for scripting, automation, and CI pipelines
- Not yet published to npm — pending stabilization, documentation, and test coverage
- Publishing will follow once CLI reaches feature freeze and includes:
  - Semantic versioning
  - README with usage examples
  - Automated tests and CI validation
  - Changelog and release notes

## 11. CLI Packaging Strategy

- CLI tool (`scan.js`) remains part of the `osint-dashboard` repo for now
- Structured with `bin` entry and modular exports to allow future publishing
- CLI can be installed globally via `npm install -g .` for internal use
- Will consider publishing as `osint-scan` once dashboard stabilizes and CLI reaches feature freeze
- This approach balances simplicity with future flexibility

## 12. Results Management Enhancements

- Added `deleteResult(id)` function in `db/db.js` using better-sqlite3.
- Created `controllers/resultsController.js` with `handleDeleteResult(req, res)` to validate IDs and remove rows.
- Updated `routes/results.js` to include `DELETE /results/:id`.
- Endpoint tested with curl:
  - Returns `{ "deleted": true }` on success
  - Returns `{ "error": "Result not found" }` if row does not exist
  - Returns `{ "error": "Invalid result id" }` for malformed IDs
- Confirms full lifecycle coverage: insert → query → delete.

## 13. Utility Functions

- Added `utils/domainUtils.js` with `cleanDomains(list)` helper.
- Normalizes, deduplicates, and validates lists of domains.
- Uses `URL()` constructor for robust hostname parsing.
- Future use: batch ingestion routes, CLI bulk scans, or CSV import pipelines.
