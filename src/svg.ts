import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type { ProcessedIcon } from './types.js';
import { deriveTitle } from './util/title.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

interface Intrinsic {
  w?: number;
  h?: number;
}

/** Parse a length value like "48", "48px", "48.0" -> number; "%"/invalid -> undefined. */
function parseLen(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const s = String(value).trim();
  if (s.endsWith('%')) return undefined;
  const m = s.match(/^-?[\d.]+/);
  if (!m) return undefined;
  const n = Number.parseFloat(m[0]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Read the intrinsic dimensions of an SVG from width/height or viewBox. */
export function getSvgSize(svgText: string): Intrinsic {
  let root: Record<string, unknown> | undefined;
  try {
    const parsed = parser.parse(svgText) as Record<string, unknown>;
    root = parsed.svg as Record<string, unknown> | undefined;
  } catch {
    root = undefined;
  }
  if (!root) return {};

  const viewBox = root['@_viewBox'];
  if (typeof viewBox === 'string') {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2]! > 0 && parts[3]! > 0) {
      return { w: parts[2], h: parts[3] };
    }
  }
  const w = parseLen(root['@_width']);
  const h = parseLen(root['@_height']);
  return { w, h };
}

/** Scale intrinsic dimensions so the longer edge equals `sizePx`, aspect preserved. */
export function targetSize(intrinsic: Intrinsic, sizePx: number): { w: number; h: number } {
  const iw = intrinsic.w;
  const ih = intrinsic.h;
  if (!iw || !ih) return { w: sizePx, h: sizePx };
  const scale = sizePx / Math.max(iw, ih);
  return {
    w: Math.max(1, Math.round(iw * scale)),
    h: Math.max(1, Math.round(ih * scale)),
  };
}

/**
 * Convert SVG markup to a data URI. Only non-distorting cleanup is performed
 * (XML declaration / DOCTYPE removal, trimming) so the icon artwork is never
 * altered, in line with Microsoft's icon usage terms.
 */
export function toDataUri(svgText: string): string {
  const cleaned = svgText
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/^\uFEFF/, '')
    .trim();
  const base64 = Buffer.from(cleaned, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/** Read and process a single SVG file into an icon ready for a library entry. */
export function processSvg(
  absPath: string,
  sourcePath: string,
  sizePx: number,
  stripTokens: string[],
  dropTokens: string[],
): ProcessedIcon {
  const text = fs.readFileSync(absPath, 'utf8');
  const size = targetSize(getSvgSize(text), sizePx);
  const title = deriveTitle(path.basename(absPath), stripTokens, dropTokens);
  return {
    title,
    dataUri: toDataUri(text),
    w: size.w,
    h: size.h,
    sourcePath,
  };
}
