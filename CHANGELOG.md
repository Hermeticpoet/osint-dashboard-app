# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- Web dashboard (Express-based) in development
- Additional TLD support for WHOIS via RDAP
- CLI enhancements: retry logic, scan history, and database logging (planned)

---

## [v1.0.0] - 2025-11-04

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
