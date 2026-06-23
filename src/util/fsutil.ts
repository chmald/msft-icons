import fs from 'node:fs';
import path from 'node:path';

/** Ensure a directory exists (recursively). */
export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

/** Remove a directory and its contents if it exists. */
export function rmrf(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Recursively collect files under `root` matching the given extension
 * (case-insensitive, including the leading dot, e.g. ".svg").
 * Returns absolute paths.
 */
export function walkFiles(root: string, ext: string): string[] {
  const out: string[] = [];
  const wantedExt = ext.toLowerCase();
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === wantedExt) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

/** Convert an OS path to forward-slashed form. */
export function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}
