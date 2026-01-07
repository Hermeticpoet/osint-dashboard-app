# SDLC Documentation – osint-dashboard

## Table of Contents

- [SDLC Documentation – osint-dashboard](#sdlc-documentation--osint-dashboard)
- [1. Feature Overview: `/scan` Route](#1-feature-overview-scan-route)
- [2. Validation Logic](#2-validation-logic)
- [3. Security Considerations](#3-security-considerations)
- [4. Testing](#4-testing)
- [5. Dependencies](#5-dependencies)
- [6. WHOIS Lookup Module](#6-whois-lookup-module)
- [7. Refactor and Full Test Coverage of Domain Scan Pipeline](#7-refactor-and-full-test-coverage-of-domain-scan-pipeline)
- [8. CLI Tool Refactor and Batch Scanning Support](#8-cli-tool-refactor-and-batch-scanning-support)
- [9. CLI Tool: Concurrency and Verbose Enhancements](#9-cli-tool-concurrency-and-verbose-enhancements)
- [10. Global CLI Setup (Internal Only)](#10-global-cli-setup-internal-only)
- [11. CLI Packaging Strategy](#11-cli-packaging-strategy)
- [12. Results Management Enhancements](#12-results-management-enhancements)
- [13. Utility Functions](#13-utility-functions)
- [14. Export Features](#14-export-features)
- [15. Flattened CSV Export Enhancement](#15-flattened-csv-export-enhancement)
- [16. Advanced Filtering and Indexing Enhancement](#16-advanced-filtering-and-indexing-enhancement)
- [17. JWT authentication and roles](#17-jwt-authentication-and-roles)
  - [17.1 Purpose and scope](#171-purpose-and-scope)
  - [17.2 Requirements](#172-requirements)
  - [17.3 Access control overview](#173-access-control-overview)
  - [17.4 Design decisions](#174-design-decisions)
  - [17.5 Implementation tasks](#175-implementation-tasks)
  - [17.6 Validation plan](#176-validation-plan)
  - [17.7 Documentation updates](#177-documentation-updates)
  - [17.8 Risk and future work](#178-risk-and-future-work)
- [18. Middleware Update](#18-middleware-update)
  - [18.1 Rationale](#181-rationale)
  - [18.2 Implementation details](#182-implementation-details)
  - [18.3 Testing](#183-testing)
- [19. Testing Harness Notes](#19-testing-harness-notes)
  - [19.1 Runtime and Jest configuration](#191-runtime-and-jest-configuration)
  - [19.2 Integration test strategy](#192-integration-test-strategy)
- [20. Coverage Summary](#20-coverage-summary)
  - [20.1 Current coverage snapshot](#201-current-coverage-snapshot)
  - [20.2 Gaps and next steps](#202-gaps-and-next-steps)

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
- Added pagination support to `GET /results`:
  - `getResults()` now accepts `offset` with validation.
  - Controller validates `limit` and `offset`, returning 400 for invalid query params.
  - Enables efficient batching via `?limit=50&offset=100`.
- Endpoint tested with curl:
  - Returns `{ "deleted": true }` on success
  - Returns `{ "error": "Result not found" }` if row does not exist
  - Returns `{ "error": "Invalid result id" }` for malformed IDs
- Confirms full lifecycle coverage: insert → query → paginate → delete.

## 13. Utility Functions

- Added `utils/domainUtils.js` with `cleanDomains(list)` helper.
- Normalizes, deduplicates, and validates lists of domains.
- Uses `URL()` constructor for robust hostname parsing.
- Future use: batch ingestion routes, CLI bulk scans, or CSV import pipelines.

---

## 14. Export Features

- Added `controllers/exportResultsController.js` using `json2csv` to convert DB rows into CSV.
- Route `GET /results/export.csv` reuses the same validation/pagination as `GET /results`.
- Prepends a timestamp header (# Exported at `ISO timestamp`) for traceability.
- Returns downloadable CSV with schema‑order fields (id, domain, ip, ssl_valid, ssl_valid_from, ssl_valid_to, ssl_days_remaining, registrar, created_at).
- If no rows match, returns headers‑only CSV with timestamp line.
- Validation errors return HTTP 400 with JSON payload; unexpected failures return HTTP 500.
- Tested via curl to confirm pagination (`limit`/`offset`), filtering (`domain`, `since`), and CSV headers.

---

## 15. Flattened CSV Export Enhancement

- **File:** `controllers/exportResultsController.js`
- **Endpoint:** `GET /results/export.csv`
- **Purpose:** Refactor CSV export to flatten nested JSON stored in the `result` column into explicit CSV fields.
- **Design Decisions:**
  - Adopted `json2csv` `Parser` for robust CSV generation with schema enforcement and proper escaping.
  - Parse `result` JSON string safely (`try/catch`) to avoid crashes on malformed data.
  - Prefer direct DB columns when present; fall back to parsed JSON values for SSL and WHOIS.
  - Normalize WHOIS fields (`creationDate` vs `creation_date`, `expirationDate` vs `expiration_date`).
  - Explicit schema fields exported in fixed order:
    - `id`, `domain`, `created_at`, `ip`
    - `ssl_valid`, `ssl_valid_from`, `ssl_valid_to`, `ssl_days_remaining`
    - `registrar`, `whois_creationDate`, `whois_expirationDate`
  - Header comments include timestamp, row count, applied limit, and offset.
  - Hard safety limit of 50,000 rows enforced; validation for `limit` and `offset`.
- **Error Handling:**
  - Malformed JSON → log warning, leave flattened fields empty/null.
  - Export failures → return `500` with `{ "error": "Failed to generate CSV export" }`.
- **Impact:**
  - Analysts can consume CSV exports directly without manual JSON parsing.
  - Maintains backward compatibility with `/results` JSON API.
  - Provides clearer separation between raw nested API data and flattened export format.
- **Testing:**
  - Verified with sample rows containing full JSON, partial JSON, and malformed JSON.
  - Confirmed fallback logic and header metadata in exported CSV.

### 16. Advanced Filtering and Indexing Enhancement

- Extended `GET /results` controller and DB layer to support filters for:
  - `ssl_valid` (boolean true/false)
  - `registrar` (string match)
  - `created_at` date ranges
  - `whois_expirationDate` ranges  
    while preserving pagination and limit/offset parameters.
- Refactored schema in `db.js` so `whois_expirationDate` is part of the permanent table definition, ensuring reproducibility across fresh database setups.
- Added SQLite indexes on `ssl_valid`, `registrar`, `created_at`, and `whois_expirationDate` for faster lookups; all created idempotently (`IF NOT EXISTS`) to avoid duplication errors.
- Introduced `db/seed.sql` to populate test data covering all filter cases (ssl_valid true/false, multiple registrars, created_at ranges, WHOIS expiration windows, combined filters).
- Validation layer ensures boolean and date parameters are well-formed (`YYYY-MM-DD`) before hitting the database.
- Verified functionality with targeted `curl` tests:
  - Single filters (ssl_valid, registrar, created_at, whois_expirationDate)
  - Combined filters with pagination
  - Negative cases (invalid values return HTTP 400)
- Confirmed accurate filtering and pagination performance improvements with seeded dataset.

## 17. JWT authentication and roles

### 17.1 Purpose and scope

**Purpose:** Introduce stateless JWT authentication with role-based access control to enforce least privilege.

**Scope:** Protect `/scan`, `/results`, `/results/:id`, `/results/export.csv` and document setup, enforcement rules, and validation.

### 17.2 Requirements

**Functional:**

- Require valid JWT for protected endpoints.
- Support roles: `admin` (full) and `read-only` (view only).
- Provide a token issuance endpoint for development (temporary stub).

**Security:**

- Sign tokens with `JWT_SECRET` stored in environment configuration.
- Enforce token expiration; configurable via environment.
- Return explicit errors for missing, invalid, or unauthorized tokens.

**Operational:**

- Document usage and validation with reproducible curl commands.
- Update README and examples; keep seeds/tests compatible.

### 17.3 Access control overview

**Admin:** Access to `POST /scan`, `GET /results`, `GET /results/export.csv`, `DELETE /results/:id`.  
**Read-only:** Access to `GET /results` only.  
**Unauthenticated:** No access to protected endpoints.

### 17.4 Design decisions

**Auth mechanism:** JWT (JSON Web Token), stateless verification.  
**Token contents:** Minimal claims: `username`, `role`; no sensitive data.  
**Secret management:** `JWT_SECRET` in `.env`; never committed.  
**Expiry policy:** Default 1 hour; override via `JWT_EXPIRES_IN`.  
**Error semantics:**

- Missing token → `401 Unauthorized` with `{ error: 'Token required' }`.
- Invalid/expired token → `403 Forbidden` with `{ error: 'Invalid or expired token' }`.
- Insufficient role → `403 Forbidden` with `{ error: 'Forbidden' }`.

### 17.5 Implementation tasks

**Dependencies:** Add JWT library to application dependencies.  
**Environment configuration:** Add `JWT_SECRET` and `JWT_EXPIRES_IN` to `.env` and `.env.example`.  
**Middleware:** Create authentication and role-authorization middleware (file: `middleware/auth.js`).  
**Routes:**

- Add token issuance route (development stub) (file: `routes/auth.js` or in `server.js`).
- Apply middleware to protected routes (file: `server.js` or route modules).

**Indexing/docs impact:** No database changes; update documentation only.  
**Version control:** Commit with clear message and reference this section number.

### 17.6 Validation plan

**Expected outcomes (matrix):**

- **GET /results:** admin → 200, read-only → 200, no token → 401, invalid → 403
- **GET /results/export.csv:** admin → 200, read-only → 403, no token → 401, invalid → 403
- **DELETE /results/:id:** admin → 200/404, read-only → 403, no token → 401, invalid → 403
- **POST /scan:** admin → 200, read-only → 403, no token → 401, invalid → 403

**Curl Commands:**

```zsh
# Issue tokens (dev stub)
ADMIN_TOKEN=$(curl -s -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}' | jq -r '.token')
USER_TOKEN=$(curl -s -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"secret"}' | jq -r '.token')

# GET /results
curl -i http://localhost:4000/results -H "Authorization: Bearer $ADMIN_TOKEN"
curl -i http://localhost:4000/results -H "Authorization: Bearer $USER_TOKEN"
curl -i http://localhost:4000/results
curl -i http://localhost:4000/results -H "Authorization: Bearer invalidtoken"

# GET /results/export.csv
curl -i http://localhost:4000/results/export.csv -H "Authorization: Bearer $ADMIN_TOKEN"
curl -i http://localhost:4000/results/export.csv -H "Authorization: Bearer $USER_TOKEN"
curl -i http://localhost:4000/results/export.csv
curl -i http://localhost:4000/results/export.csv -H "Authorization: Bearer invalidtoken"

# DELETE /results/:id
curl -i -X DELETE http://localhost:4000/results/42 -H "Authorization: Bearer $ADMIN_TOKEN"
curl -i -X DELETE http://localhost:4000/results/42 -H "Authorization: Bearer $USER_TOKEN"
curl -i -X DELETE http://localhost:4000/results/42
curl -i -X DELETE http://localhost:4000/results/42 -H "Authorization: Bearer invalidtoken"

# POST /scan
curl -i -X POST http://localhost:4000/scan \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'
curl -i -X POST http://localhost:4000/scan \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'
curl -i -X POST http://localhost:4000/scan \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'
curl -i -X POST http://localhost:4000/scan \
  -H "Authorization: Bearer invalidtoken" \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'
```

### 17.7 Documentation updates

**README:** Add “Authentication” section with: environment setup, role matrix, how to login (dev stub), curl examples for protected calls.  
**SDLC Appendix (optional):** Add links to test logs or curl transcripts if you store them.  
**Changelog:** Note introduction of JWT and role enforcement.

### 17.8 Risk and future work

**Replace stub login:** Integrate real user store and hashed passwords.  
**Secret rotation:** Establish rotation policy for `JWT_SECRET`.  
**Granular scopes:** Consider per-action permissions if needed.  
**Audit:** Log failures and admin actions for traceability.

## 18. Middleware Update

### 18.1 Rationale

The `authorizeRole` middleware was added to enforce **role-based access control (RBAC)** on top of JWT authentication:

- `authenticateToken` verifies the JWT and attaches `req.user` with a `role` claim.
- `authorizeRole(allowed)` ensures only callers with the appropriate role(s) can access specific routes.
- This enforces the access matrix for `/scan`, `/results`, `/results/export.csv`, and `DELETE /results/:id` without duplicating role checks in each controller.

The motivation was to:

- Centralize authorization logic.
- Make role behavior explicit and testable.
- Support future roles or more granular permissions with minimal changes.

### 18.2 Implementation details

- **File:** `middleware/auth.js`
- **Exports:**
  - `authenticateToken(req, res, next)`
  - `authorizeRole(allowed)`
- **Behavior of `authorizeRole(allowed)`**:
  - `allowed` can be a single string (e.g., `"admin"`) or an array of strings (e.g., `["admin", "read-only"]`).
  - If `req.user` is missing, the middleware returns `401` with `{ error: "Unauthorized" }`.
  - If `allowed` is empty or invalid, the middleware denies by default with `403` and `{ error: "Forbidden" }`.
  - If `req.user.role` is included in `allowed`, it calls `next()`.
  - Otherwise, it returns `403` with `{ error: "Forbidden" }`.
  - Role comparison is intentionally **case-sensitive** at this stage.

Routes use this middleware in two ways:

- Globally wrapping routers (e.g., `app.use('/scan', authenticateToken, authorizeRole('admin'), scanRoutes)`).
- Per-route within routers (e.g., `router.get('/', authenticateToken, authorizeRole(['admin','read-only']), handleGetResults)`).

### 18.3 Testing

`authorizeRole` is tested at two levels:

- **Unit tests** (`__tests__/unit/authorizeRole.test.js`):

  - Use plain mock `req`, `res`, and `next` objects.
  - Cover:
    - Missing `req.user` → `401 { error: "Unauthorized" }`
    - Single role allowed (match/mismatch) → `next()` vs `403`
    - Multiple roles allowed (match/mismatch) → `next()` vs `403`
    - Empty or invalid `allowed` → default deny (`403`)
    - Case-sensitive mismatches → `403`
  - Assert that `next` is only called when authorization is granted and that `res.status`/`res.json` are called exactly once on deny paths.

- **Integration tests** (`__tests__/unit/protectedRoutes.test.js`):
  - Import the real Express `app` from `server.js`.
  - Exercise real routes:
    - `POST /scan` (admin-only).
    - `GET /results` (admin + read-only).
  - Verify behavior for:
    - Missing token → `401 { error: "Token required" }` (from `authenticateToken`).
    - Invalid token → `403 { error: "Invalid or expired token" }`.
    - Valid token with wrong role → `403 { error: "Forbidden" }` (from `authorizeRole`).
    - Valid token with correct role → `200` with a JSON body.

This combination gives high confidence that the middleware behaves correctly in isolation and as wired into the real routes.

## 19. Testing Harness Notes

### 19.1 Runtime and Jest configuration

- **Runtime:** Node.js with `"type": "module"` in `package.json` (full ESM).
- **Test runner:** Jest v30 with `node --experimental-vm-modules` to support ESM imports.
- **Globals:** Tests use `@jest/globals` for `describe`, `test`, `expect`, `jest`, etc., to avoid relying on CommonJS-global Jest APIs.
- **HTTP testing:** `supertest` is used for integration-style tests against the in-memory Express app.
- **Server wiring:**
  - `server.js` now exports a named `app` instance: `export { app };`.
  - `app.listen(...)` is guarded so it only runs when not in `NODE_ENV="test"`, allowing tests to import `app` without opening a listening socket.
- **ESM mocking:**
  - Network-dependent modules like `services/scanDomain.js` are mocked with `jest.unstable_mockModule` in integration tests to keep runs offline and deterministic.

### 19.2 Integration test strategy

The integration suite in `__tests__/unit/protectedRoutes.test.js` focuses on **chained middleware + controllers** for protected routes:

- **Token generation:**
  - Uses `jsonwebtoken` to sign JWTs for `admin` and `read-only` roles.
  - Reads `JWT_SECRET` from `process.env`, with a fallback to `"test-secret"` if not set.
  - Generates intentionally invalid tokens by signing with a different secret (e.g., `"wrong-secret"`).
- **Scenarios covered:**
  - `POST /scan` (admin-only):
    - Missing token → `401` with `{ error: "Token required" }`.
    - Invalid token (bad signature) → `403` with `{ error: "Invalid or expired token" }`.
    - Valid token, `role: "read-only"` → `403` with `{ error: "Forbidden" }`.
    - Valid token, `role: "admin"` → `200` with a JSON object including a `domain` field.
  - `GET /results` (admin + read-only):
    - Missing token → `401` with `{ error: "Token required" }`.
    - Valid token, `role: "read-only"` → `200` with an array response.
    - Valid token, `role: "admin"` → `200` with an array response.
  - `GET /results/export.csv` (admin-only):
    - Missing token → `401` with `{ error: "Token required" }`.
    - Valid token, `role: "read-only"` → `403` with `{ error: "Forbidden" }`.
    - Valid token, `role: "admin"` → `200` with `Content-Type: text/csv` and a body containing headers and rows.
    - Invalid token → `403` with `{ error: "Invalid or expired token" }`.
  - `DELETE /results/:id` (admin-only):
    - Missing token → `401` with `{ error: "Token required" }`.
    - Valid token, `role: "read-only"` → `403` with `{ error: "Forbidden" }`.
    - Valid token, `role: "admin"` → `200` if the record exists and is deleted, `404` with `{ error: "Result not found" }` if the record does not exist.
    - Invalid token → `403` with `{ error: "Invalid or expired token" }`.
- **Isolation from external systems:**
  - `scanDomain` is mocked to avoid DNS/WHOIS/SSL network calls, returning a simple in-memory result.
  - Tests assert on status codes, error payloads, and minimal success shapes (e.g., object vs array, presence of known keys) instead of DB contents.

This harness ensures we verify the **end-to-end behavior of `authenticateToken` + `authorizeRole` + controllers** without introducing flaky external dependencies.

## 20. Coverage Summary

### 20.1 Current coverage snapshot

As of the latest iteration:

- **Middleware:**
  - `authenticateToken` and `authorizeRole` have **~95%+ coverage**, including happy paths and all major error branches.
  - Integration tests in `__tests__/unit/protectedRoutes.test.js` add an additional layer of coverage for real route wiring.
- **Controllers:**
  - `scanController.js` and `resultsController.js` are covered by unit tests for domain normalization, validation, query handling, and pagination.
  - Error and edge cases (invalid params, missing data) are well-represented.
- **Services:**
  - `whoisService.js` and `scanDomain.js` have strong unit coverage for supported TLDs, error handling, and normalization logic.
- **Utilities:**
  - `domainUtils.js` is covered by tests verifying cleaning, deduplication, and FQDN validation.

### 20.2 Gaps and next steps

Remaining coverage gaps and planned improvements:

- **Controllers:**
  - `exportResultsController.js` and some branches in `resultsController.js` are not yet fully exercised (e.g., complex filter combinations, CSV error paths).
  - Next step: add targeted tests to simulate malformed `result` JSON, extreme pagination values, and CSV generation failures.
- **Services:**
  - `whoisService.js` has limited tests around network failures and partial RDAP responses.
  - Next step: extend mocks to cover timeouts, malformed RDAP, and unsupported TLDs for more robust resilience testing.
- **Utilities:**
  - `domainUtils.js` can benefit from additional edge-case coverage (IDNs, punycode, very long domains).
- **Integration:**
  - Currently, integration tests focus on `/scan` and `/results`.
  - Next step: add end-to-end tests for `/results/export.csv` and `DELETE /results/:id` to validate role enforcement and error semantics across all protected routes.

The goal is to move from “high coverage on core paths” to **systematic coverage of all controllers and services**, ensuring that authorization, error handling, and data shape guarantees remain stable as the system evolves.

### Current Milestone — January 2026

- Jest test suite stable under ESM + experimental-vm-modules.
- `authenticateToken` excluded from coverage due to instrumentation issues.
- Controller coverage ~65–70%.
- **Next milestone:** Implement full test suite for `exportResultsController.js` to raise controller coverage into the 90% range.

### 20.3 Milestone Complete — Export Results Controller Test Suite

- Full Jest unit test coverage added for `exportResultsController.js`.
- CSV generation, validation, DB call parameters, and error handling are now fully tested.
- Controller coverage increased to ~97%.
- This completes the testing hardening phase before introducing the new scan service.
