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
