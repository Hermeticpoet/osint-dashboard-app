#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { program } from 'commander';
import pLimit from 'p-limit';
import { scanDomain } from '../services/scanDomain.js'; // Note the .js extension

program
  .name('scan')
  .description('Scan domains for vulnerabilities')
  .argument('[domain]', 'Domain to scan (or read from --input)')
  .option('-i, --input <file>', 'Input file with domains (one per line)')
  .option('-o, --output <file>', 'Output file (JSON or CSV)')
  .option('--format <type>', 'Output format (json|csv)', 'json')
  .option('--no-whois', 'Skip WHOIS lookup')
  .option('--concurrency <number>', 'Max concurrent scans', parseInt, 5)
  .option('--verbose', 'Verbose output')
  .action(async (domain, options) => {
    if (!domain && !options.input) {
      program.help({ error: true });
      return;
    }

    let domains = [];
    let loadedFromFile = 0;

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
            if (options.verbose)
              console.warn(`Skipping invalid domain: ${line}`);
            continue;
          }
          domains.push(line);
          loadedFromFile++;
        }
        if (options.verbose) {
          console.log(
            `Loaded ${loadedFromFile} domains from ${filePath}. Total: ${domains.length}`
          );
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.error(`Input file not found: ${filePath}`);
        } else {
          throw err;
        }
        process.exit(1);
      }
    }

    if (domains.length === 0) {
      console.log('No valid domains to scan.');
      return;
    }

    if (options.verbose) {
      console.log(
        `Scanning ${domains.length} domains with concurrency ${options.concurrency}...`
      );
      if (options.noWhois) console.log('WHOIS lookup is disabled.');
    }

    const { results, summary } = await runBatchScan(domains, {
      concurrency: Math.max(1, options.concurrency),
      skipWhois: options.noWhois,
      verbose: options.verbose,
    });

    if (options.verbose) {
      console.log(
        `Scan complete. Summary: ${summary.succeeded}/${summary.total} succeeded.`
      );
    }

    const output = formatResults(results, options.format);
    if (options.output) {
      const outPath = path.resolve(options.output);
      await ensureDir(path.dirname(outPath));
      await fs.writeFile(outPath, output);
      console.log(`Results written to ${outPath}`);
    } else {
      console.log(output);
    }
  });

program.parse();

export { runBatchScan, isValidDomain, formatResults };

async function runBatchScan(domains, opts) {
  const limit = pLimit(opts.concurrency);
  let completed = 0;
  const total = domains.length;

  const results = await Promise.all(
    domains.map(domain =>
      limit(async () => {
        if (opts.verbose) {
          process.stdout.write(
            `\rProgress: ${++completed}/${total} (${Math.round(
              (completed / total) * 100
            )}%)`
          );
        }
        return runScan(domain, opts);
      })
    )
  );

  if (opts.verbose) console.log('\n');

  const succeeded = results.filter(r => !r.error).length;
  return {
    results,
    summary: { succeeded, failed: total - succeeded, total },
  };
}

async function runScan(target, options = {}) {
  if (options.verbose) console.log(`\nScanning: ${target}`);
  try {
    const result = await scanDomain(target, { skipWhois: options.skipWhois });
    return { domain: target, result, timestamp: new Date().toISOString() };
  } catch (err) {
    if (options.verbose)
      console.warn(`Error scanning ${target}: ${err.message}`);
    return {
      domain: target,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

function isValidDomain(domain) {
  const subdomainRegex =
    /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return subdomainRegex.test(domain) || ipRegex.test(domain);
}

function formatResults(results, format = 'json') {
  if (format === 'csv') {
    const headers = ['domain', 'error', 'timestamp', 'result'];
    const csv = [headers.join(',')];
    results.forEach(r => {
      const esc = str => `"${String(str).replace(/"/g, '""')}"`;
      csv.push(
        [
          esc(r.domain),
          esc(r.error || ''),
          esc(r.timestamp),
          esc(JSON.stringify(r.result || {})),
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
