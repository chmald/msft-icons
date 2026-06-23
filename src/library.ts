import fs from 'node:fs';
import path from 'node:path';
import type { ProcessedIcon, LibraryEntry } from './types.js';
import { ensureDir } from './util/fsutil.js';

export interface BuildOptions {
  /** Collapse same-title variants into a single entry instead of suffixing. */
  collapseVariants?: boolean;
  /** Source-path substrings (priority order) deciding which variant wins. */
  preferTokens?: string[];
}

/** Lower score = preferred variant. */
function preferenceScore(sourcePath: string, preferTokens: string[]): number {
  const p = sourcePath.toLowerCase();
  for (let i = 0; i < preferTokens.length; i++) {
    if (p.includes(preferTokens[i]!.toLowerCase())) return i;
  }
  return preferTokens.length;
}

/**
 * Build draw.io library entries from processed icons:
 *  - exact-duplicate artwork (same data URI) is dropped,
 *  - with `collapseVariants`, icons sharing a title collapse to one entry
 *    (the variant whose source path best matches `preferTokens`),
 *  - otherwise distinct icons sharing a title are disambiguated " (2)", " (3)", …
 *  - output is sorted by title for deterministic, diff-friendly files.
 */
export function buildEntries(icons: ProcessedIcon[], opts: BuildOptions = {}): LibraryEntry[] {
  const preferTokens = opts.preferTokens ?? [];

  // Drop exact-duplicate artwork up front.
  const seenData = new Set<string>();
  const unique: ProcessedIcon[] = [];
  for (const icon of icons) {
    if (seenData.has(icon.dataUri)) continue;
    seenData.add(icon.dataUri);
    unique.push(icon);
  }

  let chosen: ProcessedIcon[];
  if (opts.collapseVariants) {
    // Keep one icon per title: the best-preferred variant.
    const best = new Map<string, ProcessedIcon>();
    for (const icon of unique) {
      const key = (icon.title || 'Untitled').toLowerCase();
      const current = best.get(key);
      if (
        !current ||
        preferenceScore(icon.sourcePath, preferTokens) <
          preferenceScore(current.sourcePath, preferTokens)
      ) {
        best.set(key, icon);
      }
    }
    chosen = [...best.values()];
  } else {
    chosen = unique;
  }

  const sorted = chosen.sort((a, b) =>
    a.title.toLowerCase().localeCompare(b.title.toLowerCase()) ||
    a.title.localeCompare(b.title) ||
    a.sourcePath.localeCompare(b.sourcePath),
  );

  const entries: LibraryEntry[] = [];
  const titleCounts = new Map<string, number>();
  for (const icon of sorted) {
    const base = icon.title || 'Untitled';
    const n = (titleCounts.get(base) ?? 0) + 1;
    titleCounts.set(base, n);
    const title = n > 1 ? `${base} (${n})` : base;
    entries.push({ data: icon.dataUri, w: icon.w, h: icon.h, title, aspect: 'fixed' });
  }

  return entries;
}

/** Wrap library entries in the draw.io `<mxlibrary>` envelope. */
export function buildLibraryXml(entries: LibraryEntry[]): string {
  return `<mxlibrary>${JSON.stringify(entries)}</mxlibrary>`;
}

/** Write a family's library to `<outDir>/<familyId>.xml`. Returns the file path. */
export function writeLibrary(outDir: string, familyId: string, entries: LibraryEntry[]): string {
  ensureDir(outDir);
  const file = path.join(outDir, `${familyId}.xml`);
  fs.writeFileSync(file, buildLibraryXml(entries), 'utf8');
  return file;
}
