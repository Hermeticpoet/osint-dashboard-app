#!/usr/bin/env node

const { scanDomain } = require('../services/scanDomain');
const fs = require('fs');

const args = process.argv.slice(2);
const domain = args[0];

if (!domain) {
  console.error('Usage: node scan.js <domain>');
  process.exit(1);
}

(async () => {
  try {
    const result = await scanDomain(domain);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Scan failed:', err.message);
    process.exit(2);
  }
})();
