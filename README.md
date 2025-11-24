# osint-dashboard

A modular OSINT dashboard for scanning domains, gathering intelligence, and visualizing results. Includes a web dashboard and a powerful CLI tool for automated domain scanning.

## Features

- Domain scanning via CLI
- WHOIS, SSL, and IP data collection
- Input/output file support
- Concurrency control
- Express-based web API:
  - `/scan` to insert results
  - `/results` to query results
  - `/results/:id` to delete results
- Utilities for domain cleaning and normalization

## Installation

Clone the repo and install dependencies:

```zsh
git clone https://github.com/hermeticpoet/osint-dashboard.git
cd osint-dashboard
npm install
```

## API Endpoints

The Express server runs on `http://localhost:4000` by default.

### POST /scan

Scans a single domain and stores the result in the database.

Example:

```zsh
curl -X POST http://localhost:4000/scan \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'
```

### GET /results

Fetches stored results with optional filters.

Query parameters:

- `domain`: filter by exact domain
- `limit`: maximum number of rows (default 50)
- `since`: ISO timestamp to filter by creation date

Example:

```zsh
curl "http://localhost:4000/results?domain=example.com&limit=2"
```

## Utilities

### cleanDomains(list)

Located in `utils/domainUtils.js`.

- Cleans and deduplicates domain lists.
- Normalizes casing, strips protocols/paths, and validates FQDNs.
- Returns a sorted array of valid domains.

Intended for batch ingestion routes, CLI tools, or preprocessing domain lists before scanning.

### GET /results

Fetches stored results with optional filters.

Query parameters:

- `domain`: filter by exact domain
- `limit`: maximum number of rows (default 50)
- `offset`: number of rows to skip before returning data (default 0)
- `since`: ISO timestamp to filter by creation date

Examples:
sh
# first 10 records
curl "http://localhost:4000/results?limit=10&offset=0"

# next page of 10 records
curl "http://localhost:4000/results?limit=10&offset=10"

# filter by domain with pagination
curl "http://localhost:4000/results?domain=example.com&limit=5&offset=15"

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
  - Pagination verified with >100 rows and sequential offsets
- Confirms full lifecycle coverage: insert → query → paginate → delete.