import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { loadConfig, DEFAULT_CONFIG_PATH } from './config.js';
import { walkFiles, ensureDir } from './util/fsutil.js';
import { safeFileName } from './library.js';
import { info, error } from './util/log.js';
import type { LibraryEntry } from './types.js';

interface PluginFamily {
  id: string;
  title: string;
  order: number;
  entries: Pick<LibraryEntry, 'data' | 'w' | 'h' | 'title' | 'tags'>[];
}

function parseLibrary(file: string): LibraryEntry[] {
  const text = fs.readFileSync(file, 'utf8').trim();
  const match = text.match(/^<mxlibrary>([\s\S]*)<\/mxlibrary>\s*$/);
  if (!match) throw new Error(`not a draw.io library: ${file}`);
  return JSON.parse(match[1]!) as LibraryEntry[];
}

/**
 * Build a self-contained draw.io plugin (`plugin/msft-icons.js`) that registers
 * every generated library as its own sidebar palette — so a single install
 * exposes ALL Microsoft icon families at once on self-hosted draw.io.
 */
function main(): void {
  const args = process.argv.slice(2);
  const libDir = path.resolve(process.cwd(), args[0] ?? 'libraries');
  const outFile = path.resolve(process.cwd(), args[1] ?? path.join('plugin', 'msft-icons.js'));

  const config = loadConfig(DEFAULT_CONFIG_PATH);
  // Library files are now named after the family display name, but also map the
  // family id (legacy) so the plugin works regardless of the file-naming scheme.
  const meta = new Map<string, { name: string; order: number }>();
  config.families.forEach((f, i) => {
    meta.set(f.name, { name: f.name, order: i });
    meta.set(safeFileName(f.name), { name: f.name, order: i });
    meta.set(f.id, { name: f.name, order: i });
  });

  const files = walkFiles(libDir, '.xml');
  if (files.length === 0) {
    error(`No .xml libraries found in ${libDir}. Run "npm run generate" first.`);
    process.exitCode = 1;
    return;
  }

  const families: PluginFamily[] = files
    .map((file) => {
      const base = path.basename(file, '.xml');
      const m = meta.get(base);
      const id = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const entries = parseLibrary(file).map((e) => ({
        data: e.data,
        w: e.w,
        h: e.h,
        title: e.title,
        tags: e.tags,
      }));
      return { id, title: m?.name ?? base, order: m?.order ?? 999, entries };
    })
    .filter((fam) => fam.entries.length > 0)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  const total = families.reduce((n, f) => n + f.entries.length, 0);
  const payload = JSON.stringify({
    families: families.map((f) => ({ id: f.id, title: f.title, entries: f.entries })),
  });

  const js = `/**
 * Microsoft Icons for draw.io — auto-generated plugin. Do not edit by hand.
 * Run "npm run plugin" to regenerate.
 *
 * Registers one sidebar palette per Microsoft product family (${families.length} families,
 * ${total} shapes). Plugins run on the draw.io web app and self-hosted draw.io
 * (Docker image) only — NOT draw.io Desktop or Confluence/Jira. See README option C.
 *
 * The Microsoft icons remain Microsoft's property and are subject to Microsoft's
 * terms of use; see NOTICE.md.
 */
Draw.loadPlugin(function (ui) {
  var DATA = ${payload};
  var sb = ui.sidebar;
  if (!sb) return;
  var STYLE =
    'shape=image;verticalLabelPosition=bottom;verticalAlign=top;' +
    'labelBackgroundColor=#ffffff;aspect=fixed;imageAspect=0;image=';

  DATA.families.forEach(function (fam) {
    // createVertexTemplateEntry registers each shape's tags in the search index,
    // so the palette shapes are findable via "Search Shapes".
    var fns = fam.entries.map(function (e) {
      var tags = (e.tags || fam.title);
      return sb.createVertexTemplateEntry(STYLE + e.data, e.w, e.h, '', e.title, true, false, tags);
    });
    sb.addPaletteFunctions('msft-' + fam.id, fam.title, false, fns);
  });
});
`;

  ensureDir(path.dirname(outFile));
  fs.writeFileSync(outFile, js, 'utf8');

  const kb = Math.round(Buffer.byteLength(js, 'utf8') / 1024);
  info(`Wrote ${path.relative(process.cwd(), outFile)} — ${families.length} palettes, ${total} shapes (${kb} KB).`);
  for (const fam of families) info(`  ${fam.title.padEnd(20)} ${String(fam.entries.length).padStart(5)}`);
}

main();
