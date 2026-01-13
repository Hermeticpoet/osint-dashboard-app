# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Web dashboard UI
- Additional TLD support for WHOIS (beyond .com/.net)
- Rate limiting per user/IP
- Audit logging for admin actions
- Token refresh mechanism
- Real user store with password hashing

## [1.0.0] - 2026-01-13

### Added

- JWT authentication with role-based access control (RBAC)
  - Two roles: `admin` (full access) and `read-only` (view-only)
  - Middleware: `authenticateToken` and `authorizeRole`
  - Protected endpoints: `/scan`, `/results`, `/results/export.csv`, `/results/:id` (DELETE)
- Development login stub at `POST /login` for token issuance
- Comprehensive test suite with ~97% controller coverage
- Integration tests for protected routes using supertest
- Export results controller test suite
- Server export refactoring for testability (`server.js` exports Express app)
- Full end-to-end testing of all core functionality flows
- UI validation for SSL, WHOIS, IP rendering
- Navigation flow confirmation across all pages
- Role-based UI element visibility (admin vs read-only)
- Session persistence validation across page refreshes
- Comprehensive error handling verification

### Changed

- Updated `.env` configuration: `JWT_EXPIRES_IN` set to `1h` (previously `5s` for testing)
- Refactored `server.js` to export Express app for testing
- Improved error response consistency across endpoints
- Enhanced domain validation in scan controller (pre-scan validation with `normalizeDomain` and `isValidDomain`)

### Fixed

- Incorrect `setToken` import in `login.js` (now correctly imports from `auth.js` instead of `api.js`)
- Minor UI alignment issues in results table
- Token storage and retrieval consistency

### Security

- Enforced least privilege via RBAC
- Clear error semantics for authentication/authorization failures
- Input validation prevents injection attacks
- Parameterized SQL queries prevent SQL injection

### Verified

- Admin vs read-only role behavior across all endpoints
- JWT persistence and redirect logic
- Scan workflow end-to-end (POST /scan → database storage → results display)
- Results table rendering with proper null field handling
- Delete functionality restricted to admin users
- CSV export functionality for admin users
- Filter and pagination functionality
- Error handling for authentication, authorization, and validation failures

### Added

- JWT authentication with role-based access control (RBAC)
  - Two roles: `admin` (full access) and `read-only` (view-only)
  - Middleware: `authenticateToken` and `authorizeRole`
  - Protected endpoints: `/scan`, `/results`, `/results/export.csv`, `/results/:id` (DELETE)
- Development login stub at `POST /login` for token issuance
- Comprehensive test suite with ~97% controller coverage
- Integration tests for protected routes using supertest
- Export results controller test suite
- Server export refactoring for testability (`server.js` exports Express app)

### Changed

- Updated `.env` configuration: `JWT_EXPIRES_IN` set to `1h` (previously `5s` for testing)
- Refactored `server.js` to export Express app for testing
- Improved error response consistency across endpoints
- Enhanced domain validation in scan controller (pre-scan validation with `normalizeDomain` and `isValidDomain`)

### Security

- Enforced least privilege via RBAC
- Clear error semantics for authentication/authorization failures
- Input validation prevents injection attacks
- Parameterized SQL queries prevent SQL injection

## [0.2.0] - 2025-10-30

### Added

- Advanced filtering for results endpoint
  - SSL validity filter (`ssl_valid`)
  - Registrar filter (`registrar`)
  - Date range filters (`created_from`, `created_to`, `whois_expiration_from`, `whois_expiration_to`)
- SQLite indexes for performance optimization
  - `idx_results_ssl_valid` on `ssl_valid`
  - `idx_results_registrar` on `registrar`
  - `idx_results_created_at` on `created_at`
  - `idx_results_whois_expiration` on `whois_expirationDate`
- CSV export endpoint (`GET /results/export.csv`)
  - Supports all filtering options from `GET /results`
  - Flattened CSV format with header comments
  - Hard limit of 50,000 rows per export
- Database seed script (`db/seed.sql`) for test data
- Pagination support with `limit` and `offset` parameters

### Changed

- Refactored database schema to include `whois_expirationDate` as permanent column
- Improved CSV export to flatten nested JSON fields
- Enhanced error handling for malformed JSON in export

### Fixed

- CSV export now properly handles missing nested fields
- Date validation ensures `YYYY-MM-DD` format

## [0.1.0] - 2025-10-28

### Added

- Initial project scaffold
- CLI tool (`osint-scan`) for domain scanning
  - Single domain scanning
  - Batch scanning from files
  - JSON and CSV output formats
  - Concurrency control with `p-limit`
  - Verbose mode for diagnostics
- Express API endpoint: `POST /scan`
- Domain scanning service (`services/scanService.js`) with parallel lookups
  - WHOIS lookup via `whois-json` (`.com` and `.net` domains)
  - SSL certificate validation via `ssl-checker`
  - IP resolution via ip-api.com
- Results management
  - `GET /results` with basic filtering
  - `DELETE /results/:id` for result deletion
  - Pagination support
- Database layer
  - SQLite database with `results` table
  - Domain normalization and validation utilities
- Domain utilities (`utils/domainUtils.js`)
  - `normalizeDomain()` for input sanitization
  - `isValidDomain()` for FQDN validation
  - `cleanDomains()` for batch processing

### Changed

- Migrated from CommonJS to ES Modules
  - Updated all `require()` to `import`
  - Replaced `module.exports` with `export`/`export default`
  - Added `.js` extensions to local imports
  - Configured `package.json` with `"type": "module"`

### Testing

- Jest test suite with ESM support (`--experimental-vm-modules`)
- Unit tests for domain utilities
- Unit tests for scan service
- Unit tests for WHOIS service
- Integration tests for protected routes
