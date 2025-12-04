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
  - `/results/export.csv` to export results as CSV
- Utilities for domain cleaning and normalization
- Uses SQLite (`osint.db` created automatically on first run)

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
curl "http://localhost:4000/results?ssl_valid=false&limit=200"
```

```zsh
# Domain expiring in the next 30 days (takeover target)
curl "http://localhost:4000/results?whois_expiration_from=2025-12-04&whois_expiration_to=2026-01-04"
```

```zsh
# Recently scanned domains from a specific registrar
curl "http://localhost:4000/results?created_from=2025-11-01&registrar=NameCheap&limit=100"
```

```zsh
# Pagination – third page of results
curl "http://localhost:4000/results?limit=50&offset=100"
```

## Utilities

### `cleanDomains(list)` – `utils/domainUtils.js`

Cleans and deduplicates domain lists:

- Converts to lowercase
- Strips `http://`, `https://`, paths, queries, and ports
- Validates proper FQDN format
- Returns a **sorted array of unique valid domains**

Ideal for preprocessing bulk lists before batch scanning.

### GET `/results/export.csv`

Exports filtered results as a downloadable CSV file (supports **all the same filters** as `GET /results`).

#### Examples

```zsh
# Full export
curl -OJ "http://localhost:4000/results/export.csv"
```

```zsh
# Export only domains expiring this month
curl -o expiring-december.csv "http://localhost:4000/results/export.csv?whois_expiration_from=2025-12-01&whois_expiration_to=2025-12-31"
```

```zsh
# Paginated and filtered export
curl -o page3.csv "http://localhost:4000/results/export.csv?ssl_valid=false&limit=100&offset=200"
```

Content-Type: text/csv
Content-Disposition: attachment; filename="results.csv"

### DELETE `/results/:id`

Permanently removes a specific scan result from the database.

```zsh
curl -X DELETE http://localhost:4000/results/42
# → { "deleted": true }
```

#### Error responses

```json
{ "error": "Invalid result id" }
```

##### Pagination support

All GET /results and GET /results/export.csv queries support:

- limit – maximum rows to return (default: 50)
- offset – number of rows to skip (default: 0)

```zsh
# Third page of results (50 per page)
curl "http://localhost:4000/results?limit=50&offset=100"
```

Invalid limit or offset values return HTTP 400 with a clear error message.
