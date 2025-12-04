-- db/seed.sql

-- 1) Clean slate (optional): remove existing rows
DELETE FROM results;

-- 2) Insert rows covering ssl_valid true/false, registrar diversity, created_at ranges,
--    and WHOIS expiration dates spanning different months.

-- A. Matches: ssl_valid=true
INSERT INTO results (
  domain, ip, ssl_valid, ssl_valid_from, ssl_valid_to, ssl_days_remaining,
  registrar, whois_expirationDate, created_at
) VALUES (
  'example.com', '93.184.216.34', 1,
  '2025-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 365,
  'Example Registrar', '2030-05-15', '2025-11-25T12:00:00Z'
);

-- B. Matches: registrar=Example Registrar, created_at in March 2025, whois_expirationDate in July 2025, ssl_valid=false
INSERT INTO results (
  domain, ip, ssl_valid, ssl_valid_from, ssl_valid_to, ssl_days_remaining,
  registrar, whois_expirationDate, created_at
) VALUES (
  'test1.com', '1.2.3.4', 0,
  '2025-01-01T00:00:00Z', '2025-12-31T00:00:00Z', 200,
  'Example Registrar', '2025-07-15', '2025-03-15T12:00:00Z'
);

-- C. Matches: ssl_valid=true, registrar=Another Registrar, created_at in Nov 2025, whois_expirationDate in June 2025
INSERT INTO results (
  domain, ip, ssl_valid, ssl_valid_from, ssl_valid_to, ssl_days_remaining,
  registrar, whois_expirationDate, created_at
) VALUES (
  'test2.com', '5.6.7.8', 1,
  '2025-02-01T00:00:00Z', '2026-02-01T00:00:00Z', 365,
  'Another Registrar', '2025-06-01', '2025-11-25T12:00:00Z'
);

-- D. Matches: ssl_valid=false, registrar=Namecheap, created_at in March 2025, whois_expirationDate in July 2025
INSERT INTO results (
  domain, ip, ssl_valid, ssl_valid_from, ssl_valid_to, ssl_days_remaining,
  registrar, whois_expirationDate, created_at
) VALUES (
  'march-range.com', '8.8.8.8', 0,
  '2024-12-01T00:00:00Z', '2025-12-01T00:00:00Z', 300,
  'Namecheap', '2025-07-01', '2025-03-01T00:00:00Z'
);

-- E. Matches: ssl_valid=true, registrar=GoDaddy, created_at in March 2025, whois_expirationDate in July 2025
INSERT INTO results (
  domain, ip, ssl_valid, ssl_valid_from, ssl_valid_to, ssl_days_remaining,
  registrar, whois_expirationDate, created_at
) VALUES (
  'godaddy-march.com', '9.9.9.9', 1,
  '2025-03-01T00:00:00Z', '2026-03-01T00:00:00Z', 366,
  'GoDaddy', '2025-07-31', '2025-03-31T23:59:59Z'
);

-- F. Matches: registrar=Example Registrar, whois_expirationDate in December 2025 (for combined filter with whois_expiration_to)
INSERT INTO results (
  domain, ip, ssl_valid, ssl_valid_from, ssl_valid_to, ssl_days_remaining,
  registrar, whois_expirationDate, created_at
) VALUES (
  'exp-dec.com', '10.10.10.10', 0,
  '2025-04-01T00:00:00Z', '2026-04-01T00:00:00Z', 350,
  'Example Registrar', '2025-12-15', '2025-05-20T08:00:00Z'
);
