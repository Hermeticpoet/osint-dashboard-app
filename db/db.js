// db/db.js
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Open database (creates the file if it doesn’t exist)
const dbPath = path.join(dataDir, 'osint.db');
const db = new Database(dbPath);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY,
    domain TEXT NOT NULL,
    ip TEXT NOT NULL,
    ssl_valid INTEGER NOT NULL,
    ssl_valid_from TEXT NOT NULL,
    ssl_valid_to TEXT NOT NULL,
    ssl_days_remaining INTEGER NOT NULL,
    registrar TEXT,
    created_at TEXT NOT NULL
  );
`);

function insertResult({ domain, ip, ssl, whois, timestamp }) {
  const stmt = db.prepare(`
    INSERT INTO results (
      domain, ip, ssl_valid, ssl_valid_from, ssl_valid_to, ssl_days_remaining, registrar, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sslValid = ssl?.valid ? 1 : 0;
  const sslFrom = ssl?.validFrom || '';
  const sslTo = ssl?.validTo || '';
  const sslDays = Number.isInteger(ssl?.daysRemaining) ? ssl.daysRemaining : 0;
  const registrar = whois?.registrarName || null;
  const createdAt = timestamp || new Date().toISOString();

  const info = stmt.run(
    domain.toLowerCase(), // normalize domain casing
    ip,
    sslValid,
    sslFrom,
    sslTo,
    sslDays,
    registrar,
    createdAt
  );
  return info.lastInsertRowid;
}

/**
 * Retrieve stored scan results with optional filters and pagination.
 * @param {Object} opts
 * @param {string} [opts.domain] - Exact domain match (stored in lowercase).
 * @param {number} [opts.limit=50] - Max rows to return.
 * @param {number} [opts.offset=0] - Rows to skip before returning results.
 * @param {string} [opts.since] - ISO timestamp to filter by creation date.
 * @returns {Array<Object>} Result rows ordered by newest first.
 */
function getResults({ domain, limit = 50, offset = 0, since } = {}) {
  const numericOffset = Number(offset ?? 0);
  if (!Number.isInteger(numericOffset) || numericOffset < 0) {
    throw new Error('Offset must be a non-negative integer');
  }

  let base = `SELECT * FROM results`;
  const where = [];
  const params = [];

  if (domain) {
    where.push(`domain = ?`);
    params.push(domain.toLowerCase());
  }
  if (since) {
    where.push(`created_at >= ?`);
    params.push(since);
  }
  if (where.length) {
    base += ` WHERE ` + where.join(' AND ');
  }

  base += ` ORDER BY created_at DESC`;

  if (limit) {
    base += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), numericOffset);
  } else {
    // Even if limit is falsy, ensure OFFSET is respected by setting LIMIT to -1 (all rows)
    base += ` LIMIT -1 OFFSET ?`;
    params.push(numericOffset);
  }

  const stmt = db.prepare(base);
  return stmt.all(...params);
}

/**
 * Delete a result row by ID.
 * @param {number} id - Primary key of the row to delete.
 * @returns {boolean} True if a row was deleted, otherwise false.
 */
function deleteResult(id) {
  const stmt = db.prepare(`DELETE FROM results WHERE id = ?`);
  const info = stmt.run(id);
  return info.changes > 0;
}

export { db, insertResult, getResults, deleteResult };