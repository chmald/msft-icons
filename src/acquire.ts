import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import type { SvgSource } from './types.js';
import { ensureDir, rmrf, walkFiles, toPosix } from './util/fsutil.js';
import { debug, warn } from './util/log.js';

/** Directory under the repo where zips are extracted during a build. */
const EXTRACT_DIR = path.resolve(process.cwd(), 'tmp', 'extract');

function collectFromDir(walkDir: string, rootLabel: string): SvgSource[] {
  return walkFiles(walkDir, '.svg').map((absPath) => {
    const rel = toPosix(path.relative(walkDir, absPath));
    return {
      absPath,
      relPath: `${rootLabel}/${rel}`,
      sourceRoot: rootLabel,
    };
  });
}

/**
 * Discover SVG sources under `inputDir`. Supports:
 *  - `.zip` files (extracted to tmp/extract/<name>/)
 *  - sub-folders (walked recursively)
 *  - loose `.svg` files (grouped under the "misc" source root)
 *
 * The first path segment of each source's relPath is its `sourceRoot`,
 * used by the classifier to map icons to product families.
 */
export function acquire(inputDir: string): SvgSource[] {
  if (!fs.existsSync(inputDir)) {
    throw new Error(`Input directory not found: ${inputDir}`);
  }
  rmrf(EXTRACT_DIR);
  ensureDir(EXTRACT_DIR);

  const sources: SvgSource[] = [];
  const looseSvgs: string[] = [];
  const entries = fs.readdirSync(inputDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(inputDir, entry.name);

    if (entry.isDirectory()) {
      const found = collectFromDir(full, entry.name);
      debug(`folder "${entry.name}": ${found.length} svg`);
      sources.push(...found);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.zip')) {
      const root = path.basename(entry.name, path.extname(entry.name));
      const dest = path.join(EXTRACT_DIR, root);
      try {
        new AdmZip(full).extractAllTo(dest, true);
      } catch (err) {
        warn(`failed to extract ${entry.name}: ${(err as Error).message}`);
        continue;
      }
      const found = collectFromDir(dest, root);
      debug(`zip "${entry.name}": ${found.length} svg`);
      sources.push(...found);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg')) {
      looseSvgs.push(full);
    }
  }

  if (looseSvgs.length > 0) {
    warn(`${looseSvgs.length} loose .svg file(s) grouped under source root "misc"`);
    for (const abs of looseSvgs) {
      sources.push({ absPath: abs, relPath: `misc/${path.basename(abs)}`, sourceRoot: 'misc' });
    }
  }

  return sources;
}
