# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- Web dashboard (Express-based) in development
- Additional TLD support for WHOIS via RDAP
- CLI enhancements: retry logic, scan history, and database logging (planned)

---

## [v1.0.0] - 2025-11-04

### Added
- Introduced JWT authentication with role-based access control (RBAC).
  - Roles supported: `admin` (full access) and `read-only` (view-only).
  - Middleware: `authenticateToken` and `authorizeRole` (string or array).
  - Protected endpoints: `/scan`, `/results`, `/results/export.csv`, `/results/:id` (DELETE).
- Documented validation matrix and curl test flows in SDLC Section 17.

### Changed
- Updated `.env` configuration:
  - Set `JWT_EXPIRES_IN=1h` (previously `5s` for testing).
- Updated `server.js` mounting to avoid duplicate middleware application.

### Security
- Enforced least privilege via RBAC.
- Clear error semantics for missing, invalid/expired, and insufficient role tokens.

### 🚀 Initial Release

- Modular OSINT CLI tool for domain scanning
- Features:
  - WHOIS, SSL, and DNS data collection
  - Input/output file support
  - Concurrency control
  - JSON and CSV output formats
- Express API endpoint: `POST /scan`
- Sample domains tested: `google.com`, `example.com`

### 🔧 Refactor: ES Module Migration

- Converted all CommonJS files to ES Modules:
  - `cli/scan.js`
  - `controllers/scanController.js`
  - `routes/scan.js`
  - `services/scanDomain.js`
  - `services/whoisService.js`
  - `server.js`
- Updated all `require()` to `import`
- Replaced `module.exports` with `export`/`export default`
- Added `.js` extensions to all local imports
- Verified compatibility with `"type": "module"` in `package.json`

### ✅ Testing & Validation

- Server running at `http://localhost:4000`
- CLI tested with:
  - Single domain: `osint-scan google.com --verbose`
  - Batch scan: `osint-scan --input domains.txt --output results.json`
- API tested via `curl` and Postman
- Output verified in `results.json`

---

## [v0.1.0] - 2025-10-28

- Project scaffolded
- Initial CLI prototype
- Basic WHOIS and SSL checks
