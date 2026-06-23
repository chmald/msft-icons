import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GeneratorConfig, FamilyConfig, MatchRule } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Default config path: <repo>/config/families.json */
export const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '..', 'config', 'families.json');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid config: ${message}`);
}

function strArray(v: unknown, label: string): string[] {
  if (v === undefined) return [];
  assert(Array.isArray(v) && v.every((x) => typeof x === 'string'), `${label} must be string[]`);
  return v as string[];
}

function validateRule(r: unknown, label: string): MatchRule {
  assert(r && typeof r === 'object', `${label} must be an object`);
  const m = r as Record<string, unknown>;
  return {
    sources: strArray(m.sources, `${label}.sources`),
    pathIncludes: strArray(m.pathIncludes, `${label}.pathIncludes`),
    pathExcludes: strArray(m.pathExcludes, `${label}.pathExcludes`),
    catchAll: m.catchAll === true,
  };
}

function validateFamily(f: unknown, index: number): FamilyConfig {
  assert(f && typeof f === 'object', `families[${index}] must be an object`);
  const fam = f as Record<string, unknown>;
  assert(typeof fam.id === 'string' && fam.id.length > 0, `families[${index}].id required`);
  assert(typeof fam.name === 'string' && fam.name.length > 0, `families[${index}].name required`);
  assert(fam.match && typeof fam.match === 'object', `families[${index}].match required`);

  const match = Array.isArray(fam.match)
    ? fam.match.map((r, i) => validateRule(r, `families[${index}].match[${i}]`))
    : validateRule(fam.match, `families[${index}].match`);

  return {
    id: fam.id,
    name: fam.name,
    description: typeof fam.description === 'string' ? fam.description : undefined,
    stripTokens: strArray(fam.stripTokens, `families[${index}].stripTokens`),
    dropTokens: strArray(fam.dropTokens, `families[${index}].dropTokens`),
    preferTokens: strArray(fam.preferTokens, `families[${index}].preferTokens`),
    collapseVariants: fam.collapseVariants === true,
    match,
  };
}

/** Load and validate the generator configuration. */
export function loadConfig(configPath: string = DEFAULT_CONFIG_PATH): GeneratorConfig {
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const sizePx = parsed.iconSizePx;
  assert(typeof sizePx === 'number' && sizePx > 0, 'iconSizePx must be a positive number');
  assert(Array.isArray(parsed.families) && parsed.families.length > 0, 'families[] required');

  const families = parsed.families.map((f, i) => validateFamily(f, i));
  const ids = new Set<string>();
  for (const fam of families) {
    assert(!ids.has(fam.id), `duplicate family id "${fam.id}"`);
    ids.add(fam.id);
  }
  return { iconSizePx: sizePx, families };
}
