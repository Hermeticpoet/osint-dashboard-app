README.md

# osint-dashboard

A modular OSINT dashboard for scanning domains, gathering intelligence, and visualizing results. Includes a web dashboard and a powerful CLI tool for automated domain scanning.

## Table of Contents

- [osint-dashboard](#osint-dashboard)
- [Features](#features)
- [Installation](#installation)
- [Testing](#testing)
- [Database Setup and Testing](#database-setup-and-testing)
  - [Schema](#schema)
  - [Indexes](#indexes)
  - [Seeding Test Data](#seeding-test-data)
- [Authentication and RBAC](#authentication-and-rbac)
- [API Endpoints](#api-endpoints)
  - [POST /scan](#post-scan)
  - [GET /results](#get-results)
  - [Advanced Filtering](#advanced-filtering)
  - [GET /results/exportcsv](#get-resultsexportcsv)
  - [DELETE /results/:id](#delete-resultsid)
  - [Pagination support](#pagination-support)
- [Utilities](#utilities)
- [License](#license)

## Features

- Domain scanning via CLI
- WHOIS, SSL, and IP data collection
- Input/output file support
- Concurrency control
- Express-based web API:
  - `/scan` to insert results (admin-only)
  - `/results` to query results (read-only and admin)
  - `/results/:id` to delete a result (admin-only via DELETE)
  - `/results/export.csv` to export results as CSV (admin-only)
- Utilities for domain cleaning and normalization
- Uses SQLite (`osint.db` created automatically on first run)
- Permanent schema definition in `db/db.js` including `whois_expirationDate` column
- SQLite indexes on `ssl_valid`, `registrar`, `created_at`, and `whois_expirationDate` for faster filtering
- Seed script (`db/seed.sql`) for reproducible test data covering all filter cases

## Installation

Clone the repo and install dependencies:

```zsh
git clone https://github.com/hermeticpoet/osint-dashboard.git
cd osint-dashboard
npm install
```

## Testing

This project uses Node.js ESM ("type": "module" in package.json) and Jest v30 with node --experimental-vm-modules.
Run the full test suite (zsh):

npm test
Run only the protected routes integration tests:

```zsh
npm test -- __tests__/unit/protectedRoutes.test.js
```

Jest is already configured to run the ESM tests; if you invoke Node or Jest directly, ensure you include the --experimental-vm-modules flag so ESM modules load correctly.
JWT secrets for tests
The application and tests use a shared JWT secret:
At runtime, set JWT_SECRET in your environment (e.g., via .env).
For tests, if JWT_SECRET is not set, the test harness falls back to test-secret so that tokens generated in tests still verify correctly.
Example (zsh):

```zsh
export JWT_SECRET="replace-with-a-strong-secret"
npm test
```

Generating tokens via /login
A stub login endpoint issues JWTs with role claims:
POST /login with {"username":"admin","password":"secret"} → admin token
POST /login with {"username":"user","password":"secret"} → read-only token
Example (zsh):

```zsh
ADMIN_TOKEN=$(curl -s -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}' | jq -r '.token')

USER_TOKEN=$(curl -s -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"secret"}' | jq -r '.token')
```

You can then use these tokens with Authorization: Bearer <TOKEN> for the protected routes described below.

## Database Setup and Testing

### Schema

The SQLite database (./data/osint.db) is auto-created on first server run. The results table includes:

- id (INTEGER PRIMARY KEY)
- domain (TEXT, required)
- ip (TEXT, required)
- ssl_valid (INTEGER, required; 1=true, 0=false)
- ssl_valid_from (TEXT, required)
- ssl_valid_to (TEXT, required)
- ssl_days_remaining (INTEGER, required)
- registrar (TEXT, optional)
- whois_expirationDate (TEXT, optional; new column for WHOIS filters)
- created_at (TEXT, required)

### Indexes

To accelerate filtering, the following indexes are created idempotently (IF NOT EXISTS):

- idx_results_ssl_valid on ssl_valid
- idx_results_registrar on registrar
- idx_results_created_at on created_at
- idx_results_whois_expiration on whois_expirationDate

### Seeding Test Data

A seed script (db/seed.sql) is provided to populate rows covering all filter cases.

Run:

```zsh
sqlite3 ./data/osint.db < db/seed.sql
```

Verify:

```zsh
sqlite3 ./data/osint.db "SELECT id, domain, registrar, whois_expirationDate, created_at, ssl_valid FROM results;"
```

## Authentication and RBAC

### Purpose

Introduce stateless JWT authentication with role-based access control (RBAC) to enforce least privilege across protected endpoints.

### Environment Setup

**Required Keys:**

- `JWT_SECRET`: Non-empty secret used to sign tokens.
- `JWT_EXPIRES_IN`: Token lifetime (e.g., 1h).

**Files to update:**

- `.env`: Add actual values.
- `.env.example`: Include the keys without secrets.

```env
# .env
JWT_SECRET=replace-with-a-strong-secret
JWT_EXPIRES_IN=1h
```

### Roles Matrix

| Endpoint                  | Admin | Read-only |
| ------------------------- | :---: | :-------: |
| POST `/scan`              |  ✅   |    ❌     |
| GET `/results`            |  ✅   |    ✅     |
| GET `/results/export.csv` |  ✅   |    ❌     |
| DELETE `/results/:id`     |  ✅   |    ❌     |

### Development login (stub)

**Endpoint:** `POST /login`
**Purpose:** Issues tokens for development with role claim.
**Sample users:**

- `admin`: `{"username":"admin","password":"secret"}`
- `read-only`: `{"username":"user","password":"secret"}`

### Curl examples

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

### Error Semantics

**Missing token:** `401 Unauthorized` with `{"error":"Token required"}`.
**Invalid or expired token:** `403 Forbidden` with `{"error":"Invalid or expired token"}`.
**Insufficient role:** `403 Forbidden` with `{"error":"Forbidden: insufficient role"}`.

## API Endpoints

The Express server runs on `http://localhost:4000` by default.

### POST /scan

Scans a single domain and stores the result in the database.
Auth: Admin-only. Requires `Authorization: Bearer <JWT_TOKEN>`.

Example:

```zsh
curl -X POST http://localhost:4000/scan \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'
```

### GET /results

Fetches stored results with optional filters.
Auth: Read-only and admin. Requires `Authorization: Bearer <JWT_TOKEN>`.

Query parameters:

- `domain`: filter by exact domain
- `limit`: maximum number of rows (default 50)
- `since`: ISO timestamp to filter by creation date

Example:

```zsh
curl "http://localhost:4000/results?domain=example.com&limit=2" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Advanced Filtering

`GET /results` supports these powerful optional query parameters:

| Parameter                                       | Description                                  | Example / Values       |
| ----------------------------------------------- | -------------------------------------------- | ---------------------- |
| `domain`                                        | Exact domain match (case-insensitive)        | `example.com`          |
| `limit`                                         | Maximum rows to return (default: 50)         | `100`                  |
| `offset`                                        | Rows to skip for pagination (default: 0)     | `50`                   |
| `since`                                         | ISO timestamp filter on `created_at`         | `2025-01-01T00:00:00Z` |
| `ssl_valid`                                     | Filter valid or invalid/expired certificates | `true` or `false`      |
| `registrar`                                     | Exact registrar name                         | `NameCheap`, `GoDaddy` |
| `created_from` / `created_to`                   | YYYY-MM-DD bounds for scan date              | `2025-11-01`           |
| `whois_expiration_from` / `whois_expiration_to` | YYYY-MM-DD bounds for WHOIS expiration       | `2025-12-04`           |

#### Real-world threat hunting examples

```zsh
# Expired or invalid SSL certificates (high risk)
curl "http://localhost:4000/results?ssl_valid=false&limit=200" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

```zsh
# Domain expiring in the next 30 days (takeover target)
curl "http://localhost:4000/results?whois_expiration_from=2025-12-04&whois_expiration_to=2026-01-04" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

```zsh
# Recently scanned domains from a specific registrar
curl "http://localhost:4000/results?created_from=2025-11-01&registrar=NameCheap&limit=100" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

```zsh
# Pagination – third page of results
curl "http://localhost:4000/results?limit=50&offset=100" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

## Utilities

`cleanDomains(list)` – `utils/domainUtils.js`

Cleans and deduplicates domain lists:

- Converts to lowercase
- Strips `http://`, `https://`, paths, queries, and ports
- Validates proper FQDN format
- Returns a **sorted array of unique valid domains**

Ideal for preprocessing bulk lists before batch scanning.

### GET `/results/export.csv`

Exports filtered results as a downloadable CSV file (supports **all the same filters** as `GET /results`).
Auth: Admin-only. Requires `Authorization: Bearer <JWT_TOKEN>`.

#### Examples

```zsh
# Full export
curl -OJ "http://localhost:4000/results/export.csv" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

```zsh
# Export only domains expiring this month
curl -o expiring-december.csv "http://localhost:4000/results/export.csv?whois_expiration_from=2025-12-01&whois_expiration_to=2025-12-31" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

```zsh
# Paginated and filtered export
curl -o page3.csv "http://localhost:4000/results/export.csv?ssl_valid=false&limit=100&offset=200" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

#### Response Headers

Content-Type: text/csv
Content-Disposition: attachment; filename="results.csv"

### DELETE `/results/:id`

Permanently removes a specific scan result from the database.
Auth: Admin-only. Requires `Authorization: Bearer <JWT_TOKEN>`.

```zsh
curl -X DELETE http://localhost:4000/results/42 \
  -H "Authorization: Bearer <JWT_TOKEN>"
# → { "deleted": true }
```

#### Error responses

Invalid or malformed ID:

```json
{ "error": "Invalid result id" }
```

### Pagination support

All GET /results and GET /results/export.csv queries support:

- limit – maximum rows to return (default: 50)
- offset – number of rows to skip (default: 0)

```zsh
# Third page of results (50 per page)
curl "http://localhost:4000/results?limit=50&offset=100" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Invalid limit or offset values return HTTP 400 with a clear error message.

Full lifecycle supported: insert → query → filter → paginate → export → delete

## License

MIT License

Copyright (c) 2025 Kevin Walton

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights  
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell  
copies of the Software, and to permit persons to whom the Software is  
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in  
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR  
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE  
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER  
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,  
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN  
THE SOFTWARE.
