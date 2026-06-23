import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { walkFiles } from './util/fsutil.js';
import { xmlUnescapeContent } from './library.js';
import { info, error } from './util/log.js';

interface FileResult {
  file: string;
  entries: number;
  errors: string[];
}

const DATA_PREFIX = 'data:image/svg+xml;base64,';
const BAD_AMP = /&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/;

function validateFile(file: string): FileResult {
  const result: FileResult = { file, entries: 0, errors: [] };
  const text = fs.readFileSync(file, 'utf8').trim();

  const match = text.match(/^<mxlibrary>([\s\S]*)<\/mxlibrary>\s*$/);
  if (!match) {
    result.errors.push('missing <mxlibrary>...</mxlibrary> envelope');
    return result;
  }

  // The envelope is parsed by draw.io as strict XML — a bare "&"/"<"/">"
  // breaks loading and must be XML-escaped.
  if (BAD_AMP.test(match[1]!) || /[<>]/.test(match[1]!)) {
    result.errors.push('content is not XML-escaped (bare &, < or > in payload)');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(xmlUnescapeContent(match[1]!));
  } catch (err) {
    result.errors.push(`payload is not valid JSON: ${(err as Error).message}`);
    return result;
  }
  if (!Array.isArray(parsed)) {
    result.errors.push('payload is not a JSON array');
    return result;
  }

  const titles = new Set<string>();
  parsed.forEach((entry, i) => {
    const e = entry as Record<string, unknown>;
    const where = `entry[${i}]`;

    if (typeof e.title !== 'string' || e.title.length === 0) {
      result.errors.push(`${where}: missing title`);
    } else if (titles.has(e.title)) {
      result.errors.push(`${where}: duplicate title "${e.title}"`);
    } else {
      titles.add(e.title);
    }

    if (typeof e.w !== 'number' || e.w <= 0) result.errors.push(`${where}: invalid w`);
    if (typeof e.h !== 'number' || e.h <= 0) result.errors.push(`${where}: invalid h`);

    if (typeof e.data !== 'string' || !e.data.startsWith(DATA_PREFIX)) {
      result.errors.push(`${where}: data must be a ${DATA_PREFIX} URI`);
    } else {
      const b64 = e.data.slice(DATA_PREFIX.length);
      let decoded = '';
      try {
        decoded = Buffer.from(b64, 'base64').toString('utf8');
      } catch {
        result.errors.push(`${where}: data is not valid base64`);
      }
      if (decoded && !decoded.includes('<svg')) {
        result.errors.push(`${where}: decoded data is not an SVG`);
      }
    }
  });

  result.entries = parsed.length;
  return result;
}

function main(): void {
  const args = process.argv.slice(2);
  const target = args[0] ? path.resolve(process.cwd(), args[0]) : path.resolve(process.cwd(), 'libraries');

  let files: string[];
  const stat = fs.existsSync(target) ? fs.statSync(target) : undefined;
  if (stat?.isDirectory()) {
    files = walkFiles(target, '.xml');
  } else if (stat?.isFile()) {
    files = [target];
  } else {
    error(`Not found: ${target}`);
    process.exitCode = 1;
    return;
  }

  if (files.length === 0) {
    error(`No .xml libraries found under ${target}`);
    process.exitCode = 1;
    return;
  }

  let totalErrors = 0;
  let totalEntries = 0;
  info(`Validating ${files.length} librar${files.length === 1 ? 'y' : 'ies'} ...`);
  info('');

  for (const file of files) {
    const r = validateFile(file);
    totalEntries += r.entries;
    const name = path.relative(process.cwd(), file);
    if (r.errors.length === 0) {
      info(`OK   ${name}  (${r.entries} entries)`);
    } else {
      totalErrors += r.errors.length;
      info(`FAIL ${name}  (${r.entries} entries, ${r.errors.length} error(s))`);
      for (const msg of r.errors.slice(0, 12)) info(`       - ${msg}`);
      if (r.errors.length > 12) info(`       ... and ${r.errors.length - 12} more`);
    }
  }

  info('');
  info(`Total: ${totalEntries} entries across ${files.length} file(s); ${totalErrors} error(s).`);
  process.exitCode = totalErrors > 0 ? 1 : 0;
}

main();
