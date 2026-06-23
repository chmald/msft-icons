import fs from 'node:fs';
import path from 'node:path';
import type { ProcessedIcon, LibraryEntry } from './types.js';
import { ensureDir } from './util/fsutil.js';

export interface BuildOptions {
  /** Collapse same-title variants into a single entry instead of suffixing. */
  collapseVariants?: boolean;
  /** Source-path substrings (priority order) deciding which variant wins. */
  preferTokens?: string[];
  /** Extra search keywords added to every entry (e.g. the family name + "Microsoft"). */
  searchTags?: string;
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
 * Pick the icon to keep among duplicates. Preference order:
 *   1. larger intrinsic artwork (sharper at any display size),
 *   2. better `preferTokens` match (e.g. a colour variant),
 *   3. larger raw byte size,
 *   4. stable source-path order.
 */
function pickBetter(a: ProcessedIcon, b: ProcessedIcon, preferTokens: string[]): ProcessedIcon {
  if (a.intrinsicArea !== b.intrinsicArea) return a.intrinsicArea > b.intrinsicArea ? a : b;
  const pa = preferenceScore(a.sourcePath, preferTokens);
  const pb = preferenceScore(b.sourcePath, preferTokens);
  if (pa !== pb) return pa < pb ? a : b;
  if (a.bytes !== b.bytes) return a.bytes > b.bytes ? a : b;
  return a.sourcePath.localeCompare(b.sourcePath) <= 0 ? a : b;
}

function dedupeBy(
  icons: ProcessedIcon[],
  keyOf: (icon: ProcessedIcon) => string,
  preferTokens: string[],
): ProcessedIcon[] {
  const best = new Map<string, ProcessedIcon>();
  for (const icon of icons) {
    const key = keyOf(icon);
    const current = best.get(key);
    best.set(key, current ? pickBetter(current, icon, preferTokens) : icon);
  }
  return [...best.values()];
}

/**
 * Build draw.io library entries from processed icons:
 *  - **identical artwork is removed** (matched ignoring ids/declared size), keeping
 *    the larger-resolution copy — see {@link pickBetter},
 *  - with `collapseVariants`, icons sharing a title collapse to one entry
 *    (again the larger/preferred variant wins),
 *  - otherwise distinct icons sharing a title are disambiguated " (2)", " (3)", …
 *  - output is sorted by title for deterministic, diff-friendly files.
 */
export function buildEntries(icons: ProcessedIcon[], opts: BuildOptions = {}): LibraryEntry[] {
  const preferTokens = opts.preferTokens ?? [];

  // 1) Drop duplicate artwork (keep the larger copy).
  let chosen = dedupeBy(icons, (i) => i.artKey, preferTokens);

  // 2) Optionally collapse remaining same-title variants to one entry.
  if (opts.collapseVariants) {
    chosen = dedupeBy(chosen, (i) => (i.title || 'Untitled').toLowerCase(), preferTokens);
  }

  const sorted = chosen.sort((a, b) =>
    a.title.toLowerCase().localeCompare(b.title.toLowerCase()) ||
    a.title.localeCompare(b.title) ||
    a.sourcePath.localeCompare(b.sourcePath),
  );

  const entries: LibraryEntry[] = [];
  const titleCounts = new Map<string, number>();
  const tags = opts.searchTags?.trim();
  for (const icon of sorted) {
    const base = icon.title || 'Untitled';
    const n = (titleCounts.get(base) ?? 0) + 1;
    titleCounts.set(base, n);
    const title = n > 1 ? `${base} (${n})` : base;
    const entry: LibraryEntry = { data: icon.dataUri, w: icon.w, h: icon.h, title, aspect: 'fixed' };
    if (tags) entry.tags = tags;
    entries.push(entry);
  }

  return entries;
}

/** Wrap library entries in the draw.io `<mxlibrary>` envelope. */
export function buildLibraryXml(entries: LibraryEntry[]): string {
  return `<mxlibrary>${JSON.stringify(entries)}</mxlibrary>`;
}

/** Make a display name safe as a file name (filesystem- and URL-friendly). */
export function safeFileName(name: string): string {
  return name
    .replace(/&/g, 'and')
    .replace(/[<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Write a family's library to `<outDir>/<name>.xml`. Returns the file path. */
export function writeLibrary(outDir: string, name: string, entries: LibraryEntry[]): string {
  ensureDir(outDir);
  const file = path.join(outDir, `${safeFileName(name)}.xml`);
  fs.writeFileSync(file, buildLibraryXml(entries), 'utf8');
  return file;
}
