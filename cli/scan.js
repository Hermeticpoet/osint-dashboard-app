#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const { program } = require('commander'); // npm i commander
const { scanDomain } = require('../services/scanDomain');

program
  .name('scan')
  .description('Scan domains for vulnerabilities')
  .argument('[domain]', 'Domain to scan (or read from --input)')
  .option('-i, --input <file>', 'Input file with domains (one per line)')
  .option('-o, --output <file>', 'Output file (JSON)')
  .option('--format <type>', 'Output format (json|csv)', 'json')
  .action(async (domain, options) => {
    if (!domain && !options.input) {
      program.help({ error: true });
      return;
    }

    // Validate and read inputs
    const domains = [];
    if (domain) {
      if (!isValidDomain(domain)) {
        console.error(`Invalid domain: ${domain}`);
        process.exit(1);
      }
      domains.push(domain);
    }
    if (options.input) {
      const filePath = path.resolve(options.input);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean);
        for (const line of lines) {
          if (!isValidDomain(line)) {
            console.warn(`Skipping invalid domain: ${line}`);
            continue;
          }
          domains.push(line);
        }
        console.log(`Loaded ${domains.length} domains from ${filePath}`);
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.error(`Input file not found: ${filePath}`);
        } else {
          throw err;
        }
        process.exit(1);
      }
    }

    // Parallel scan (adjust concurrency as needed)
    console.log(`Scanning ${domains.length} domains...`);
    const results = await Promise.all(domains.map(runScan));
    console.log('Scan complete.');

    // Output
    const output = formatResults(results, options.format);
    if (options.output) {
      const outPath = path.resolve(options.output);
      await ensureDir(path.dirname(outPath)); // Creates output dir if needed
      await fs.writeFile(outPath, output);
      console.log(`Results written to ${outPath}`);
    } else {
      console.log(output);
    }
  });

program.parse();

// Helpers
async function runScan(target) {
  try {
    const result = await scanDomain(target);
    return { domain: target, result, timestamp: new Date().toISOString() }; // Added timestamp for reusability
  } catch (err) {
    return {
      domain: target,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

function isValidDomain(domain) {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(
    domain
  ); // Basic regex; enhance as needed
}

function formatResults(results, format = 'json') {
  if (format === 'csv') {
    // Simple CSV converter (add a lib like csv-stringify for production)
    const headers = ['domain', 'error', 'timestamp', 'result']; // Adjust based on result shape
    const csv = [headers.join(',')];
    results.forEach(r => {
      csv.push(
        [
          r.domain,
          r.error || '',
          `"${r.timestamp}"`,
          JSON.stringify(r.result || {}),
        ].join(',')
      );
    });
    return csv.join('\n');
  }
  return JSON.stringify(results, null, 2);
}

async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}
