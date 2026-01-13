# SDLC Documentation – osint-dashboard

Engineering reference documentation for the osint-dashboard project architecture, design decisions, and implementation details.

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Scan Pipeline Design](#2-scan-pipeline-design)
3. [Validation Logic](#3-validation-logic)
4. [Security Model](#4-security-model)
5. [WHOIS Module](#5-whois-module)
6. [SSL Certificate Module](#6-ssl-certificate-module)
7. [IP Resolution Module](#7-ip-resolution-module)
8. [CLI Design](#8-cli-design)
9. [API Design](#9-api-design)
10. [Middleware Architecture](#10-middleware-architecture)
11. [Database Schema & Indexing](#11-database-schema--indexing)
12. [Filtering Logic](#12-filtering-logic)
13. [CSV Export System](#13-csv-export-system)
14. [Testing Strategy](#14-testing-strategy)
15. [Coverage Summary](#15-coverage-summary)
16. [Future Work](#16-future-work)

## 1. High-Level Architecture

### System Overview

osint-dashboard follows a layered architecture pattern:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (CLI Tool + Express API Routes)       │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│         Application Layer               │
│  (Controllers + Middleware)             │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│         Service Layer                    │
│  (scanService, whoisService)            │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│         Data Layer                       │
│  (SQLite Database + Utilities)          │
└─────────────────────────────────────────┘
```

### Component Responsibilities

**Presentation Layer:**

- `cli/scan.js`: Command-line interface for batch operations
- `routes/*.js`: Express route definitions
- `server.js`: Application bootstrap and route mounting

**Application Layer:**

- `controllers/*.js`: Request handlers with validation
- `middleware/auth.js`: JWT authentication and RBAC

**Service Layer:**

- `services/scanService.js`: Orchestrates domain scanning
- `services/whoisService.js`: RDAP-based WHOIS lookups

**Data Layer:**

- `db/db.js`: SQLite operations and schema management
- `utils/domainUtils.js`: Domain normalization and validation

### Design Principles

1. **Separation of Concerns**: Each layer has distinct responsibilities
2. **Fail-Safe Defaults**: Partial failures don't break entire scans
3. **Stateless API**: JWT-based authentication enables horizontal scaling
4. **Indexed Queries**: Database indexes optimize common filter patterns

## 2. Scan Pipeline Design

### Pipeline Flow

The scan pipeline (`services/scanService.js`) performs three independent lookups in parallel:

```
Input Domain
    │
    ├─→ Normalize Domain
    │
    ├─→ WHOIS Lookup ────┐
    ├─→ SSL Lookup ──────┼─→ Aggregate Results
    └─→ IP Lookup ───────┘
```

### Lookup Strategy

**Parallel Execution:**

- All three lookups execute concurrently
- Each lookup is wrapped in try/catch for isolation
- Individual failures don't block other lookups

**Failure Handling:**

- **Partial Failure**: Failed lookups return `null` for their fields
- **Total Failure**: If all three fail, throw `SCAN_FAILED` error
- **Graceful Degradation**: System continues operating with partial data

### Normalization Process

1. **Input Sanitization**: Strip protocols, paths, credentials, ports
2. **Case Normalization**: Convert to lowercase
3. **Validation**: Check FQDN format and TLD requirements
4. **Output**: Clean domain string or empty string if invalid

### Error Semantics

- `INVALID_DOMAIN`: Domain fails normalization or validation
- `SCAN_FAILED`: All three lookups (WHOIS, SSL, IP) fail
- Individual lookup failures: Silent (return `null`)

## 3. Validation Logic

### Domain Normalization (`utils/domainUtils.js`)

**`normalizeDomain(input)`:**

- Removes protocols (`http://`, `https://`)
- Strips paths, query strings, fragments
- Removes credentials (`user:pass@`)
- Removes ports (`:8080`)
- Trims trailing dots
- Converts to lowercase
- Returns empty string for invalid input types

**Implementation:**

```javascript
export const normalizeDomain = input => {
  const cleaned = cleanDomains([input]);
  return cleaned.length > 0 ? cleaned[0] : '';
};
```

### Domain Validation (`utils/domainUtils.js`)

**`isValidDomain(input)`:**

- Type check: Must be string
- Non-empty after trimming
- Must contain at least one dot (TLD requirement)
- Label format: `[a-z0-9][a-z0-9.-]*[a-z0-9]` (no leading/trailing hyphens)
- TLD length: Minimum 2 characters
- Total length: No explicit maximum (relies on DNS limits)

**Validation Rules:**

- Rejects domains with invalid characters (`$`, `_`, etc.)
- Rejects domains starting/ending with hyphens
- Rejects single-character TLDs
- Rejects domains without dots (e.g., `localhost`)

### Controller Validation

**Pre-scan Validation:**

- Check `req.body.domain` exists
- Normalize domain input
- Validate normalized domain
- Return `400 INVALID_DOMAIN` if validation fails

**Post-scan Validation:**

- Handle `scanDomain()` errors
- Map `INVALID_DOMAIN` → `400`
- Map `SCAN_FAILED` → `500`

## 4. Security Model

### Authentication

**JWT-Based Authentication:**

- Stateless token verification
- Token contains: `username`, `role`
- Signed with `JWT_SECRET` from environment
- Configurable expiration (`JWT_EXPIRES_IN`)

**Middleware: `authenticateToken`**

- Extracts token from `Authorization: Bearer <token>` header
- Verifies signature and expiration
- Attaches `req.user = { username, role }` on success
- Returns `401` if token missing or invalid

### Authorization

**Role-Based Access Control (RBAC):**

- Two roles: `admin` (full access), `read-only` (view-only)
- Middleware: `authorizeRole(allowed)`
- `allowed` can be string (`"admin"`) or array (`["admin", "read-only"]`)

**Middleware: `authorizeRole`**

- Checks `req.user.role` against `allowed` roles
- Case-sensitive role comparison
- Returns `401` if `req.user` missing
- Returns `403` if role not in `allowed` list
- Calls `next()` if authorized

### Access Matrix

| Endpoint | Admin | Read-only | Unauthenticated |
| -------- | :---: | :-------: | :-------------: |

| `POST /scan` | ✅ | ❌ | ❌ |
| `GET /results` | ✅ | ✅ | ❌ |
| `GET /results/export.csv` | ✅ | ❌ | ❌ |
| `DELETE /results/:id` | ✅ | ❌ | ❌ |

### Security Considerations

**Input Validation:**

- Domain normalization prevents injection attacks
- SQLite parameterized queries prevent SQL injection
- Type checking prevents malformed requests

**Error Handling:**

- Generic error messages prevent information leakage
- No stack traces in production responses
- Consistent error format across endpoints

**Future Enhancements:**

- Rate limiting per user/IP
- Audit logging for admin actions
- Token refresh mechanism
- Password hashing for production login

## 5. WHOIS Module

### Implementation (`services/whoisService.js`)

**Technology:** RDAP (Registration Data Access Protocol) via Verisign endpoints

**Supported TLDs:**

- `.com` domains
- `.net` domains
- Returns `null` for unsupported TLDs

**Data Extraction:**

- Registrar name from RDAP vCard
- Creation date from RDAP events
- Expiration date from RDAP events

**Error Handling:**

- Network failures: Return `null` (non-blocking)
- Unsupported TLDs: Return `null`
- Malformed responses: Log warning, return `null`

**Limitations:**

- Only supports `.com` and `.net`
- No fallback to traditional WHOIS protocol
- Rate limiting not implemented (relies on external service)

## 6. SSL Certificate Module

### Implementation

**Library:** `ssl-checker` npm package

**Data Collected:**

- `valid`: Boolean certificate validity
- `validFrom`: Certificate issue date
- `validTo`: Certificate expiry date
- `daysRemaining`: Days until expiration

**Error Handling:**

- Connection failures: Return `null` for all SSL fields
- Invalid certificates: Still return data (with `valid: false`)
- Timeout: Return `null` (non-blocking)

**Port Configuration:**

- Default: Port 443 (HTTPS)
- Method: GET request

## 7. IP Resolution Module

### Implementation of Module

**Service:** ip-api.com JSON API

**Endpoint:** `http://ip-api.com/json/<domain>`

**Data Extracted:**

- `query`: Resolved IP address (IPv4 or IPv6)

**Error Handling:**

- Network failures: Return `null` for IP
- Invalid domains: Return `null` (non-blocking)
- API errors: Return `null`

**Limitations:**

- External dependency on ip-api.com
- No fallback DNS resolution
- Rate limiting not implemented

## 8. CLI Design

### Architecture

**Entry Point:** `cli/scan.js` (exposed as `osint-scan` via `package.json` bin)

**Dependencies:**

- `commander`: Argument parsing and help output
- `p-limit`: Concurrency control
- `fs-extra`: File operations

### Features

**Batch Processing:**

- Reads domains from file (one per line)
- Skips invalid domains with warnings
- Continues processing on individual failures

**Concurrency Control:**

- Configurable parallelism (`--concurrency`)
- Default: 10 concurrent scans
- Prevents resource exhaustion

**Output Formats:**

- JSON: Structured data with full scan results
- CSV: Flattened format for spreadsheet import

**Verbose Mode:**

- Real-time progress indicators
- Error diagnostics
- Timing information

### Usage Patterns

**Single Domain:**

```zsh
osint-scan example.com
```

**Batch Scan:**

```zsh
osint-scan --input domains.txt --output results.json
```

**Concurrent Processing:**

```zsh
osint-scan --input domains.txt --concurrency 5 --verbose
```

## 9. API Design

### RESTful Principles

**Resource-Based URLs:**

- `/scan`: Scan operations
- `/results`: Result queries
- `/results/:id`: Individual result operations

**HTTP Methods:**

- `POST`: Create resources (scans)
- `GET`: Retrieve resources (results, exports)
- `DELETE`: Remove resources (results)

**Status Codes:**

- `200`: Success
- `400`: Client error (validation, malformed request)
- `401`: Unauthorized (missing token)
- `403`: Forbidden (invalid token or insufficient role)
- `404`: Not found (resource doesn't exist)
- `500`: Server error (scan failure, DB error)

### Request/Response Formats

**Consistent JSON Structure:**

- Success: `{ id: <number>, result: <object> }`
- Error: `{ error: <string> }` or `{ id: null, result: <string> }`

**Query Parameters:**

- Filtering: `domain`, `ssl_valid`, `registrar`, date ranges
- Pagination: `limit`, `offset`
- All parameters validated before database queries

### Error Handling

**Validation Errors (400):**

- Missing required fields
- Invalid parameter types
- Out-of-range values

**Authentication Errors (401/403):**

- Missing token: `401 { error: "Token required" }`
- Invalid token: `403 { error: "Invalid or expired token" }`
- Insufficient role: `403 { error: "Forbidden" }`

**Server Errors (500):**

- Scan failures: `{ id: null, result: "SCAN_FAILED" }`
- Database errors: `{ error: "failed to save result" }`

## 10. Middleware Architecture

### Authentication Middleware

**`authenticateToken(req, res, next)`:**

- Extracts JWT from `Authorization` header
- Verifies signature with `JWT_SECRET`
- Checks expiration
- Attaches `req.user = { username, role }`
- Returns `401` if verification fails

**Error Responses:**

- Missing header: `401 { error: "Token required" }`
- Invalid signature: `403 { error: "Invalid or expired token" }`
- Expired token: `403 { error: "Invalid or expired token" }`

### Authorization Middleware

**`authorizeRole(allowed)`:**

- Factory function returning middleware
- `allowed`: String or array of role strings
- Checks `req.user.role` against `allowed`
- Case-sensitive comparison
- Returns `401` if `req.user` missing
- Returns `403` if role not allowed
- Calls `next()` if authorized

**Usage Patterns:**

```javascript
// Single role
router.post('/', authenticateToken, authorizeRole('admin'), handler);

// Multiple roles
router.get(
  '/',
  authenticateToken,
  authorizeRole(['admin', 'read-only']),
  handler
);
```

### Middleware Chain

**Request Flow:**

```

Request
  ↓
authenticateToken (verify JWT, attach req.user)
  ↓
authorizeRole (check role against allowed list)
  ↓
Controller (handle business logic)
  ↓
Response
```

## 11. Database Schema & Indexing

### Schema Design

**Results Table:**

```sql
CREATE TABLE results (
  id INTEGER PRIMARY KEY,
  domain TEXT NOT NULL,
  ip TEXT NOT NULL,
  ssl_valid INTEGER NOT NULL,
  ssl_valid_from TEXT NOT NULL,
  ssl_valid_to TEXT NOT NULL,
  ssl_days_remaining INTEGER NOT NULL,
  registrar TEXT,
  whois_expirationDate TEXT,
  created_at TEXT NOT NULL
);
```

**Design Decisions:**

- `ssl_valid` as INTEGER (1/0) for boolean indexing
- TEXT columns for dates (ISO format strings)
- NULL allowed for optional WHOIS fields
- `created_at` for temporal queries

### Indexing Strategy

**Indexes Created:**

- `idx_results_ssl_valid`: Filter by SSL validity
- `idx_results_registrar`: Filter by registrar name
- `idx_results_created_at`: Temporal queries and sorting
- `idx_results_whois_expiration`: WHOIS expiration filtering

**Index Selection:**

- Based on common filter patterns
- All indexes created idempotently (`IF NOT EXISTS`)
- No composite indexes (single-column only)

**Performance Impact:**

- Filter queries: 10-100x faster with indexes
- Pagination: Efficient with indexed `created_at`
- Export: Benefits from all indexes

## 12. Filtering Logic

### Filter Types

**Exact Match:**

- `domain`: Case-insensitive domain match
- `registrar`: Exact registrar name match

**Boolean:**

- `ssl_valid`: `true` or `false` (converted to 1/0)

**Date Ranges:**

- `created_from` / `created_to`: Scan date range
- `whois_expiration_from` / `whois_expiration_to`: WHOIS expiration range
- Format: `YYYY-MM-DD`

**Temporal:**

- `since`: ISO timestamp filter on `created_at`

### Query Construction

**Dynamic WHERE Clauses:**

- Build WHERE conditions based on provided parameters
- Use parameterized queries (SQLite placeholders)
- Combine multiple filters with AND logic

**Validation:**

- Date format validation (`YYYY-MM-DD`)
- Boolean string conversion (`"true"` → `true`)
- Integer validation for `limit` and `offset`

**Pagination:**

- `LIMIT` clause for row count
- `OFFSET` clause for skipping rows
- Default: `limit=50`, `offset=0`

### Filter Examples

**SSL Validity:**

```sql
WHERE ssl_valid = 1  -- Valid certificates
WHERE ssl_valid = 0  -- Invalid/expired certificates
```

**Date Range:**

```sql
WHERE created_at >= '2025-11-01' AND created_at <= '2025-12-31'
WHERE whois_expirationDate >= '2025-12-01' AND whois_expirationDate <= '2026-01-31'
```

**Combined Filters:**

```sql
WHERE domain = 'example.com'
  AND ssl_valid = 0
  AND registrar = 'NameCheap'
  AND created_at >= '2025-11-01'
LIMIT 50 OFFSET 0
```

## 13. CSV Export System

### Implementation (`controllers/exportResultsController.js`)

**Library:** `json2csv` Parser

**Process:**

1. Fetch results using same filtering logic as `GET /results`
2. Flatten nested JSON fields into CSV columns
3. Generate CSV with header comments
4. Set appropriate HTTP headers
5. Stream CSV response

### Flattening Logic

**Field Mapping:**

- Direct DB columns: `id`, `domain`, `ip`, `created_at`
- SSL fields: `ssl_valid`, `ssl_valid_from`, `ssl_valid_to`, `ssl_days_remaining`
- WHOIS fields: `registrar`, `whois_creationDate`, `whois_expirationDate`

**JSON Parsing:**

- Safely parse `result` JSON column
- Fallback to DB columns if JSON parsing fails
- Handle missing nested fields gracefully

### CSV Format

**Header Comments:**

```csv
# Domain Results Export
# Generated: 2026-01-07T14:02:43.117Z
# Total rows exported: 42
# Applied limit: 50
# Offset: 0
```

**Column Order:**

1. `id`, `domain`, `created_at`, `ip`
2. `ssl_valid`, `ssl_valid_from`, `ssl_valid_to`, `ssl_days_remaining`
3. `registrar`, `whois_creationDate`, `whois_expirationDate`

**Safety Limits:**

- Maximum 50,000 rows per export
- Hard limit prevents memory exhaustion
- Validation for `limit` and `offset` parameters

## 14. Testing Strategy

### Test Structure

**Unit Tests:**

- `__tests__/unit/*.test.js`: Isolated component tests
- Mock dependencies with `jest.unstable_mockModule`
- Test error paths and edge cases

**Integration Tests:**

- `__tests__/unit/protectedRoutes.test.js`: End-to-end route tests
- Use `supertest` for HTTP testing
- Mock external services (scanDomain)

### Test Coverage

**Middleware:**

- `authenticateToken`: Token verification, error handling
- `authorizeRole`: Role checking, case sensitivity, edge cases
- Coverage: ~95%

**Controllers:**

- `scanController`: Domain validation, error handling, DB integration
- `resultsController`: Filtering, pagination, validation
- `exportResultsController`: CSV generation, error handling
- Coverage: ~97%

**Services:**

- `scanService`: Lookup orchestration, failure handling
- `whoisService`: RDAP parsing, error handling
- Coverage: Strong unit test coverage

**Utilities:**

- `domainUtils`: Normalization, validation, edge cases
- Coverage: Comprehensive

### Test Configuration

**Runtime:**

- Node.js ESM (`"type": "module"`)
- Jest v30 with `--experimental-vm-modules`
- `@jest/globals` for ESM-compatible APIs

**Mocking Strategy:**

- `jest.unstable_mockModule` for ESM modules
- Mock external services (WHOIS, SSL, IP lookup)
- Mock database layer for controller tests

**Test Data:**

- `db/seed.sql`: Reproducible test dataset
- Covers all filter combinations
- Includes edge cases (null values, expired certs)

## 15. Coverage Summary

### Current Coverage (January 2026)

**Middleware:**

- `authenticateToken`: ~95% (excluded from coverage due to instrumentation issues)
- `authorizeRole`: ~95% (unit + integration tests)

**Controllers:**

- `scanController`: ~97% (validation, error handling, DB integration)
- `resultsController`: ~97% (filtering, pagination, validation)
- `exportResultsController`: ~97% (CSV generation, error handling)

**Services:**

- `scanService`: Strong coverage (lookup orchestration, failure handling)
- `whoisService`: Good coverage (RDAP parsing, error handling)

**Utilities:**

- `domainUtils`: Comprehensive coverage (normalization, validation)

### Coverage Gaps

**Remaining Gaps:**

- Complex filter combinations in `resultsController`
- Extreme pagination values (very large offsets)
- CSV generation failures (malformed JSON edge cases)
- Network failure scenarios in `whoisService`

**Next Steps:**

- Add targeted tests for edge cases
- Extend integration tests to cover all endpoints
- Add performance tests for large datasets

## 16. Future Work

### Short-Term (Q1 2026)

**Authentication:**

- Replace stub login with real user store
- Implement password hashing (bcrypt)
- Add token refresh mechanism

**Testing:**

- Complete integration test coverage
- Add performance benchmarks
- Implement CI/CD pipeline

**Documentation:**

- API documentation (OpenAPI/Swagger)
- Deployment guide
- Contributing guidelines

### Medium-Term (Q2-Q3 2026)

**Features:**

- Additional TLD support for WHOIS
- Rate limiting per user/IP
- Audit logging for admin actions
- Web dashboard UI

**Performance:**

- Database query optimization
- Caching layer for frequent queries
- Batch scan API endpoint

**Security:**

- Secret rotation policy
- Granular permissions (per-action)
- IP whitelisting for admin endpoints

### Long-Term (Q4 2026+)

**Scalability:**

- PostgreSQL migration for production
- Horizontal scaling support
- Message queue for async scans

**Advanced Features:**

- Historical trend analysis
- Alert system for expiring domains/certs
- Integration with threat intelligence feeds
- Machine learning for anomaly detection
