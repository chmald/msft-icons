import path from 'node:path';
import process from 'node:process';
import { loadConfig, DEFAULT_CONFIG_PATH } from './config.js';
import { acquire } from './acquire.js';
import { classify } from './classify.js';
import { processSvg } from './svg.js';
import { buildEntries, writeLibrary } from './library.js';
import type { ProcessedIcon } from './types.js';
import { info, warn, error, setVerbose } from './util/log.js';

interface CliOptions {
  input: string;
  out: string;
  config: string;
  families: string[];
  size?: number;
  report: boolean;
  verbose: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    input: path.resolve(process.cwd(), 'downloads'),
    out: path.resolve(process.cwd(), 'libraries'),
    config: DEFAULT_CONFIG_PATH,
    families: [],
    report: false,
    verbose: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Missing value for ${arg}`);
      return v;
    };
    switch (arg) {
      case '--input':
      case '-i':
        opts.input = path.resolve(process.cwd(), next());
        break;
      case '--out':
      case '-o':
        opts.out = path.resolve(process.cwd(), next());
        break;
      case '--config':
      case '-c':
        opts.config = path.resolve(process.cwd(), next());
        break;
      case '--family':
      case '-f':
        opts.families.push(...next().split(',').map((s) => s.trim()).filter(Boolean));
        break;
      case '--size':
      case '-s':
        opts.size = Number.parseInt(next(), 10);
        break;
      case '--report':
        opts.report = true;
        break;
      case '--verbose':
      case '-v':
        opts.verbose = true;
        break;
      default:
        if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    }
  }
  return opts;
}

function printUsage(): void {
  info(`msft-icons -> draw.io library generator

Usage:
  npm run generate -- [options]

Options:
  -i, --input <dir>     Input dir with zips/folders/SVGs   (default: ./downloads)
  -o, --out <dir>       Output dir for .xml libraries       (default: ./libraries)
  -c, --config <file>   Family config JSON                  (default: config/families.json)
  -f, --family <ids>    Only build these families (comma-separated, repeatable)
  -s, --size <px>       Override icon size                  (default: from config)
  --report              Classify and report only; write nothing
  -v, --verbose         Verbose logging
  -h, --help            Show this help`);
}

function runBuild(rawArgs: string[]): number {
  const opts = parseArgs(rawArgs);
  setVerbose(opts.verbose);

  const config = loadConfig(opts.config);
  const sizePx = opts.size ?? config.iconSizePx;

  let families = config.families;
  if (opts.families.length > 0) {
    const wanted = new Set(opts.families);
    const known = new Set(config.families.map((f) => f.id));
    for (const id of wanted) if (!known.has(id)) warn(`unknown family id "${id}" (skipped)`);
    families = config.families.filter((f) => wanted.has(f.id));
    if (families.length === 0) {
      error('No matching families to build.');
      return 1;
    }
  }

  info(`Scanning ${opts.input} ...`);
  const sources = acquire(opts.input);
  info(`Found ${sources.length} SVG file(s).`);
  if (sources.length === 0) {
    warn('No SVGs found. Place icon zips or folders under the input directory.');
    return 1;
  }

  const { byFamily, unclassified } = classify(sources, families);

  info('');
  info(`${'Family'.padEnd(20)} ${'Icons'.padStart(6)}  Output`);
  info(`${'-'.repeat(20)} ${'-'.repeat(6)}  ${'-'.repeat(30)}`);

  let totalEntries = 0;
  for (const family of families) {
    const srcs = byFamily.get(family.id) ?? [];
    if (srcs.length === 0) {
      info(`${family.name.padEnd(20)} ${String(0).padStart(6)}  (no icons)`);
      continue;
    }

    const icons: ProcessedIcon[] = [];
    for (const src of srcs) {
      try {
        icons.push(
          processSvg(src.absPath, src.relPath, sizePx, family.stripTokens ?? [], family.dropTokens ?? []),
        );
      } catch (err) {
        warn(`skip ${src.relPath}: ${(err as Error).message}`);
      }
    }

    const entries = buildEntries(icons, {
      collapseVariants: family.collapseVariants,
      preferTokens: family.preferTokens,
    });
    totalEntries += entries.length;

    if (opts.report) {
      info(`${family.name.padEnd(20)} ${String(entries.length).padStart(6)}  (report only)`);
    } else {
      const file = writeLibrary(opts.out, family.name, entries);
      info(`${family.name.padEnd(20)} ${String(entries.length).padStart(6)}  ${path.relative(process.cwd(), file)}`);
    }
  }

  info(`${'-'.repeat(20)} ${'-'.repeat(6)}`);
  info(`${'TOTAL'.padEnd(20)} ${String(totalEntries).padStart(6)}`);

  if (unclassified.length > 0) {
    info('');
    warn(`${unclassified.length} SVG(s) did not match any family. Examples:`);
    for (const s of unclassified.slice(0, 8)) info(`    ${s.relPath}`);
    warn('Tune config/families.json (sources/pathIncludes) to classify these.');
  }

  return 0;
}

function main(): void {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (command === '-h' || command === '--help' || command === 'help') {
    printUsage();
    return;
  }

  const args = command === 'build' ? argv.slice(1) : argv;
  try {
    process.exitCode = runBuild(args);
  } catch (err) {
    error((err as Error).message);
    process.exitCode = 1;
  }
}

main();
