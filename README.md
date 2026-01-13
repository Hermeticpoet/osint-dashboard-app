# osint-dashboard

A production-ready OSINT (Open Source Intelligence) platform for domain scanning, intelligence gathering, and threat analysis. Combines a RESTful Express API with a powerful CLI tool for automated domain reconnaissance.

## Overview

osint-dashboard provides comprehensive domain intelligence through parallel WHOIS, SSL certificate, and IP resolution lookups. Results are stored in SQLite with advanced filtering, pagination, and CSV export capabilities. The system enforces role-based access control (RBAC) via JWT authentication, ensuring secure access to sensitive OSINT data.

## Architecture

```
┌─────────────────┐
│   CLI Tool      │  ← Batch scanning, automation
│  (osint-scan)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Express API    │  ← RESTful endpoints
│   (server.js)   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌──────────┐
│  Scan  │  │ Results  │
│Service │  │  Query   │
└────┬───┘  └────┬──────┘
     │           │
     └─────┬─────┘
           ▼
      ┌─────────┐
      │ SQLite   │
      │ Database │
      └─────────┘
```

**Core Components:**

- **Scan Pipeline**: `services/scanService.js` orchestrates WHOIS, SSL, and IP lookups
- **API Layer**: Express routes with JWT authentication and RBAC middleware
- **Data Layer**: SQLite with indexed columns for fast filtering
- **CLI Tool**: Standalone scanner for batch operations

## Features

### Domain Intelligence

- **WHOIS Lookup**: Registrar, creation date, expiration date via RDAP (`.com` and `.net` domains)
- **SSL Certificate Analysis**: Validity, issue/expiry dates, days remaining
- **IP Resolution**: IPv4/IPv6 addresses via ip-api.com
- **Partial Failure Handling**: Graceful degradation if individual lookups fail

### API Capabilities

- **RESTful Endpoints**: JSON-based API with consistent error handling
- **Advanced Filtering**: Query by domain, SSL validity, registrar, date ranges
- **Pagination**: Efficient result batching with `limit` and `offset`
- **CSV Export**: Downloadable reports with all filter options
- **Role-Based Access**: Admin and read-only roles with JWT authentication

### CLI Tool

- **Batch Scanning**: Process domains from files
- **Concurrent Processing**: Configurable parallelism with `p-limit`
- **Multiple Output Formats**: JSON and CSV support
- **Verbose Mode**: Real-time progress and diagnostics

## Installation

### Prerequisites

- Node.js 18+ with ESM support
- npm or yarn

### Setup

```zsh
git clone https://github.com/hermeticpoet/osint-dashboard.git
cd osint-dashboard
npm install
```

### Environment Configuration

Create a `.env` file:

```env
JWT_SECRET=your-strong-secret-key-here
JWT_EXPIRES_IN=1h
PORT=4000
```

## Running the Server

```zsh
npm start
```

The API will be available at `http://localhost:4000` (or your configured `PORT`).

### Development Mode

```zsh
npm run dev:start
```

## CLI Usage

### Install Globally

```zsh
npm install -g .
```

### Basic Usage

```zsh
# Single domain scan
osint-scan example.com

# Batch scan from file
osint-scan --input domains.txt --output results.json

# CSV output with verbose logging
osint-scan --input domains.txt --output results.csv --format csv --verbose

# Concurrency control
osint-scan --input domains.txt --concurrency 5
```

### CLI Options

- `--input <file>`: Input file with domains (one per line)
- `--output <file>`: Output file path
- `--format <json|csv>`: Output format (default: json)
- `--concurrency <n>`: Maximum parallel scans (default: 10)
- `--verbose`: Enable detailed progress output

## API Endpoints

### Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```http
Authorization: Bearer <your-jwt-token>
```

#### POST /login

Development stub for token issuance:

```zsh
curl -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}'
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Credentials:**

- Admin: `{"username":"admin","password":"secret"}`
- Read-only: `{"username":"user","password":"secret"}`

### Scan Endpoints

#### POST /scan

Initiates a domain scan and stores the result.

**Authentication:** Admin-only

**Request:**

```zsh
curl -X POST http://localhost:4000/scan \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'
```

**Success Response (200):**

```json
{
  "id": 42,
  "result": {
    "domain": "example.com",
    "ip": "93.184.216.34",
    "ssl": {
      "valid": true,
      "validFrom": "2024-01-01",
      "validTo": "2025-12-31",
      "daysRemaining": 300
    },
    "whois": {
      "registrarName": "NameCheap",
      "creationDate": "2020-01-01T00:00:00Z",
      "expirationDate": "2026-01-01T00:00:00Z"
    },
    "timestamp": "2026-01-07T14:02:43.117Z"
  }
}
```

**Error Responses:**

- `400`: `{"id": null, "result": "INVALID_DOMAIN"}` - Invalid or missing domain
- `401`: `{"error": "Token required"}` - Missing authentication
- `403`: `{"error": "Forbidden"}` - Insufficient permissions
- `500`: `{"id": null, "result": "SCAN_FAILED"}` - All lookups failed

### Results Endpoints

#### GET /results

Retrieves stored scan results with optional filtering and pagination.

**Authentication:** Admin and read-only

**Query Parameters:**

| Parameter | Type | Description | Example |
| --------- | ---- | ----------- | ------- |

| `domain` | string | Exact domain match (case-insensitive) | `example.com` |
| `limit` | integer | Maximum rows (default: 50) | `100` |
| `offset` | integer | Rows to skip (default: 0) | `50` |
| `since` | ISO timestamp | Filter by creation date | `2025-01-01T00:00:00Z` |
| `ssl_valid` | boolean | Filter by SSL validity | `true` or `false` |
| `registrar` | string | Exact registrar match | `NameCheap` |
| `created_from` | YYYY-MM-DD | Start date for scan date range | `2025-11-01` |
| `created_to` | YYYY-MM-DD | End date for scan date range | `2025-12-31` |
| `whois_expiration_from` | YYYY-MM-DD | Start date for WHOIS expiration | `2025-12-01` |
| `whois_expiration_to` | YYYY-MM-DD | End date for WHOIS expiration | `2026-01-31` |

**Example:**

```zsh
curl "http://localhost:4000/results?domain=example.com&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**

```json
[
  {
    "id": 1,
    "domain": "example.com",
    "ip": "93.184.216.34",
    "ssl_valid": 1,
    "ssl_valid_from": "2024-01-01",
    "ssl_valid_to": "2025-12-31",
    "ssl_days_remaining": 300,
    "registrar": "NameCheap",
    "whois_expirationDate": "2026-01-01",
    "created_at": "2026-01-07T14:02:43.117Z"
  }
]
```

#### GET /results/export.csv

Exports results as CSV with all filtering options available.

**Authentication:** Admin-only

**Example:**

```zsh
# Full export
curl -OJ "http://localhost:4000/results/export.csv" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Filtered export
curl -o expired-ssl.csv \
  "http://localhost:4000/results/export.csv?ssl_valid=false&limit=1000" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response Headers:**

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="domain-results.csv"`

#### DELETE /results/:id

Deletes a specific scan result by ID.

**Authentication:** Admin-only

**Example:**

```zsh
curl -X DELETE http://localhost:4000/results/42 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Success Response (200):**

```json
{
  "deleted": true
}
```

**Error Responses:**

- `400`: `{"error": "Invalid result id"}` - Malformed ID
- `404`: `{"error": "Result not found"}` - ID doesn't exist
- `403`: `{"error": "Forbidden"}` - Insufficient permissions

## Authentication & RBAC

### Role Matrix

| Endpoint | Admin | Read-only |
| -------- | :---: | :-------: |

| `POST /scan` | ✅ | ❌ |
| `GET /results` | ✅ | ✅ |
| `GET /results/export.csv` | ✅ | ❌ |
| `DELETE /results/:id` | ✅ | ❌ |

### Error Semantics

- **Missing Token**: `401 Unauthorized` → `{"error": "Token required"}`
- **Invalid/Expired Token**: `403 Forbidden` → `{"error": "Invalid or expired token"}`
- **Insufficient Role**: `403 Forbidden` → `{"error": "Forbidden"}`

### Token Usage

```zsh
# Get admin token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}' | jq -r '.token')

# Use in requests
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:4000/results
```

## Database Schema

The SQLite database (`./data/osint.db`) is auto-created on first run.

### Results Table

| Column | Type | Constraints | Description |
| ------ | ---- | ----------- | ----------- |

| `id` | INTEGER | PRIMARY KEY | Auto-incrementing ID |
| `domain` | TEXT | NOT NULL | Normalized domain name |
| `ip` | TEXT | NOT NULL | Resolved IP address |
| `ssl_valid` | INTEGER | NOT NULL | 1=true, 0=false |
| `ssl_valid_from` | TEXT | NOT NULL | Certificate issue date |
| `ssl_valid_to` | TEXT | NOT NULL | Certificate expiry date |
| `ssl_days_remaining` | INTEGER | NOT NULL | Days until expiry |
| `registrar` | TEXT | NULL | WHOIS registrar name |
| `whois_expirationDate` | TEXT | NULL | Domain expiration date |
| `created_at` | TEXT | NOT NULL | Scan timestamp (ISO) |

### Indexes

Optimized indexes for common filter operations:

- `idx_results_ssl_valid` on `ssl_valid`
- `idx_results_registrar` on `registrar`
- `idx_results_created_at` on `created_at`
- `idx_results_whois_expiration` on `whois_expirationDate`

### Seeding Test Data

```zsh
sqlite3 ./data/osint.db < db/seed.sql
```

## Filtering & Pagination

### Threat Hunting Examples

**Expired SSL Certificates:**

```zsh
curl "http://localhost:4000/results?ssl_valid=false&limit=200" \
  -H "Authorization: Bearer $TOKEN"
```

**Domains Expiring Soon:**

```zsh
curl "http://localhost:4000/results?whois_expiration_from=2025-12-01&whois_expiration_to=2026-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

**Registrar Analysis:**

```zsh
curl "http://localhost:4000/results?registrar=NameCheap&created_from=2025-11-01" \
  -H "Authorization: Bearer $TOKEN"
```

**Pagination:**

```zsh
# Page 3 (50 per page)
curl "http://localhost:4000/results?limit=50&offset=100" \
  -H "Authorization: Bearer $TOKEN"
```

## CSV Export

The CSV export endpoint supports all filtering and pagination options available in `GET /results`.

**Features:**

- Header comments with export metadata
- Flattened schema (no nested JSON)
- Proper CSV escaping
- Hard limit of 50,000 rows per export

**Example CSV Output:**

```csv
# Domain Results Export
# Generated: 2026-01-07T14:02:43.117Z
# Total rows exported: 42
# Applied limit: 50
# Offset: 0

"id","domain","created_at","ip","ssl_valid","ssl_valid_from","ssl_valid_to","ssl_days_remaining","registrar","whois_creationDate","whois_expirationDate"
1,"example.com","2026-01-07T14:02:43.117Z","93.184.216.34",1,"2024-01-01","2025-12-31",300,"NameCheap","2020-01-01T00:00:00Z","2026-01-01T00:00:00Z"
```

## Utilities

### Domain Utilities (`utils/domainUtils.js`)

**`normalizeDomain(input)`**

- Strips protocols, paths, credentials, ports
- Converts to lowercase
- Returns normalized domain or empty string

**`isValidDomain(input)`**

- Validates FQDN format
- Checks TLD length (≥2 characters)
- Validates label structure

**`cleanDomains(list)`**

- Batch normalization and validation
- Deduplication
- Returns sorted array of unique valid domains

## Testing

### Running Tests

```zsh
# Full test suite
npm test

# Specific test file
npm test -- __tests__/unit/scanController.test.js

# Integration tests
npm test -- __tests__/unit/protectedRoutes.test.js
```

### Test Configuration

- **Runtime**: Node.js ESM (`"type": "module"`)
- **Framework**: Jest v30 with `--experimental-vm-modules`
- **Coverage**: ~97% controller coverage, ~95% middleware coverage

### JWT Secrets for Tests

Tests use `JWT_SECRET` from environment, falling back to `test-secret` if unset:

```zsh
export JWT_SECRET="test-secret"
npm test
```

## Functional Testing (Completed 13 Jan 2026)

All core functionality has been validated through comprehensive end-to-end testing. The following flows have been verified and are fully operational:

### Authentication & Session Management

- **Login Flow (Admin)**: Successfully authenticates with admin credentials, receives JWT token, and redirects to dashboard
- **Login Flow (Read-only)**: Successfully authenticates with read-only credentials, receives JWT token, and redirects to dashboard
- **JWT Storage**: Token persists in localStorage across page refreshes
- **Session Persistence**: User remains logged in when navigating between pages
- **Auto-redirect**: Unauthenticated users are redirected to login page; authenticated users bypass login

### Dashboard Navigation

- **Dashboard Access**: Both admin and read-only users can access dashboard
- **Role Display**: User role (admin/read-only) is correctly displayed in header
- **Navigation Links**: Scan and Results links function correctly
- **Logout**: Logout button clears session and redirects to login

### Domain Scanning

- **Scan Endpoint**: POST /scan successfully initiates domain scans (admin-only)
- **Scan Results**: Results display correctly with domain, IP, SSL, and WHOIS data
- **Result Persistence**: Scanned domains are saved to database with unique IDs
- **Error Handling**: Invalid domains return appropriate error messages
- **UI Rendering**: Scan results render in organized, readable format

### Results Management

- **Results Table**: GET /results displays all stored scan results in tabular format
- **Data Rendering**: All fields (domain, IP, SSL status, registrar, dates) render correctly
- **Null Field Handling**: Missing WHOIS data displays as "N/A" without errors
- **Pagination**: Results paginate correctly with 50 results per page
- **Filtering**: Domain, SSL status, and registrar filters function as expected

### Admin Operations

- **Delete Functionality**: Admin users can delete results via DELETE /results/:id
- **Delete UI**: Delete buttons appear only for admin users
- **Read-only Restrictions**: Read-only users see "Read-only" badge instead of delete buttons
- **CSV Export**: Admin users can export results as CSV via GET /results/export.csv
- **Export Functionality**: CSV downloads with correct filename and content

### Role-Based Access Control

- **Admin Permissions**: Admin users have access to all features (scan, view, delete, export)
- **Read-only Permissions**: Read-only users can view results but cannot scan, delete, or export
- **UI Restrictions**: Interface elements (buttons, links) are conditionally displayed based on role
- **API Enforcement**: Backend correctly enforces role restrictions with 403 Forbidden responses

### Error Handling

- **Authentication Errors**: Missing or invalid tokens redirect to login
- **Permission Errors**: Insufficient role access shows appropriate error messages
- **Network Errors**: Failed API calls display user-friendly error messages
- **Validation Errors**: Invalid input shows clear validation feedback

## Known Limitations / Future Enhancements

### UI/UX Improvements

- **WHOIS Fallback Labels**: Currently displays "N/A" for missing WHOIS data; could add explanatory labels (e.g., "WHOIS data unavailable for this TLD")
- **SSL Date Formatting**: SSL certificate dates could be formatted more readably (e.g., "Jan 15, 2026" instead of ISO format)
- **UI Polish**: Additional visual enhancements such as loading spinners, success notifications, and improved mobile responsiveness
- **Mobile Responsiveness**: Current design is functional on mobile but could benefit from optimized layouts for smaller screens

### Feature Enhancements

- **Real-time Updates**: Results table could auto-refresh or show live scan progress
- **Bulk Operations**: Support for bulk delete or bulk export operations
- **Advanced Filtering UI**: Date range pickers and multi-select filters in the web interface
- **Scan History**: View scan history for a specific domain across time

### Technical Improvements

- **Error Recovery**: Automatic retry logic for failed scans
- **Offline Support**: Service worker for offline functionality
- **Performance**: Virtual scrolling for large result sets
- **Accessibility**: Enhanced ARIA labels and keyboard navigation support

## License

MIT License

Copyright (c) 2025 Kevin Walton

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
